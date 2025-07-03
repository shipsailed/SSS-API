import { 
  ConsensusMessage, 
  ConsensusState,
  TokenPayload,
  ConsensusError,
  Stage2Config
} from '../../shared/types/index.js';
import { CryptoService } from '../../shared/crypto/index.js';
import { TokenVerifier } from '../verification/token-verifier.js';

interface Node {
  id: string;
  publicKey: string;
  endpoint: string;
  isActive: boolean;
}

interface Request {
  id: string;
  token: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export class PBFTConsensus {
  private nodeId: string;
  private nodes: Map<string, Node>;
  private state: ConsensusState;
  private crypto: CryptoService;
  private tokenVerifier: TokenVerifier;
  private pendingRequests: Map<string, Request>;
  private committedRequests: Set<string>;
  
  private f: number; // Byzantine fault tolerance
  private isPrimary: boolean;
  
  constructor(
    nodeId: string,
    nodes: Node[],
    private config: Stage2Config
  ) {
    this.nodeId = nodeId;
    this.nodes = new Map(nodes.map(n => [n.id, n]));
    this.crypto = new CryptoService();
    this.tokenVerifier = new TokenVerifier(config);
    this.pendingRequests = new Map();
    this.committedRequests = new Set();
    
    // Calculate f (number of faulty nodes tolerated)
    this.f = Math.floor((nodes.length - 1) / 3);
    
    // Initialize consensus state
    this.state = {
      view: 0,
      sequence: 0,
      phase: 'IDLE',
      prepares: new Map(),
      commits: new Map()
    };
    
    // Determine if this node is primary
    this.updatePrimary();
  }

  /**
   * Process incoming request - REQUIRES valid token
   * This is where cryptographic enforcement happens
   */
  async processRequest(request: Request): Promise<void> {
    // CRITICAL: Token verification is mandatory
    let tokenPayload: TokenPayload;
    try {
      tokenPayload = await this.tokenVerifier.verifyToken(request.token);
    } catch (error) {
      // Invalid token - reject without processing
      // This prevents consensus resource consumption
      console.error('Invalid token, rejecting request:', error);
      throw new ConsensusError('Invalid token - request rejected');
    }
    
    // Only proceed with valid token
    if (this.isPrimary) {
      await this.initiateConsensus(request, tokenPayload);
    } else {
      // Forward to primary
      await this.forwardToPrimary(request);
    }
  }

  /**
   * Initiate 3-phase PBFT consensus
   */
  private async initiateConsensus(
    request: Request,
    tokenPayload: TokenPayload
  ): Promise<void> {
    // Check if already processed
    if (this.committedRequests.has(request.id)) {
      console.log('Request already committed:', request.id);
      return;
    }
    
    // Store request
    this.pendingRequests.set(request.id, request);
    
    // Phase 1: PRE-PREPARE
    const sequence = ++this.state.sequence;
    const digest = this.crypto.hash(JSON.stringify(request));
    
    const prePrepareMsg: ConsensusMessage = {
      type: 'PRE_PREPARE',
      view: this.state.view,
      sequence,
      digest,
      nodeId: this.nodeId,
      signature: await this.crypto.sign(digest),
      token: request.token
    };
    
    // Broadcast PRE-PREPARE to all backup nodes
    await this.broadcast(prePrepareMsg);
    
    // Move to PREPARE phase
    this.state.phase = 'PRE_PREPARE';
  }

  /**
   * Handle incoming consensus messages
   */
  async handleMessage(message: ConsensusMessage): Promise<void> {
    // Verify message signature
    const isValid = await this.crypto.verify(
      message.digest,
      message.signature,
      this.nodes.get(message.nodeId)?.publicKey
    );
    
    if (!isValid) {
      console.error('Invalid message signature from', message.nodeId);
      return;
    }
    
    switch (message.type) {
      case 'PRE_PREPARE':
        await this.handlePrePrepare(message);
        break;
      case 'PREPARE':
        await this.handlePrepare(message);
        break;
      case 'COMMIT':
        await this.handleCommit(message);
        break;
    }
  }

  private async handlePrePrepare(message: ConsensusMessage): Promise<void> {
    if (this.isPrimary) return; // Primary doesn't process its own PRE-PREPARE
    
    // Verify token (mandatory)
    try {
      await this.tokenVerifier.verifyToken(message.token!);
    } catch {
      console.error('Invalid token in PRE-PREPARE');
      return;
    }
    
    // Accept PRE-PREPARE and move to PREPARE phase
    this.state.phase = 'PREPARE';
    
    // Send PREPARE message
    const prepareMsg: ConsensusMessage = {
      type: 'PREPARE',
      view: message.view,
      sequence: message.sequence,
      digest: message.digest,
      nodeId: this.nodeId,
      signature: await this.crypto.sign(message.digest)
    };
    
    await this.broadcast(prepareMsg);
  }

  private async handlePrepare(message: ConsensusMessage): Promise<void> {
    // Store PREPARE message
    const key = `${message.view}-${message.sequence}`;
    if (!this.state.prepares.has(key)) {
      this.state.prepares.set(key, new Map());
    }
    this.state.prepares.get(key)!.set(message.nodeId, message);
    
    // Check if we have 2f+1 matching PREPARE messages
    const prepares = this.state.prepares.get(key)!;
    if (prepares.size >= 2 * this.f + 1) {
      // Move to COMMIT phase
      this.state.phase = 'COMMIT';
      
      // Send COMMIT message
      const commitMsg: ConsensusMessage = {
        type: 'COMMIT',
        view: message.view,
        sequence: message.sequence,
        digest: message.digest,
        nodeId: this.nodeId,
        signature: await this.crypto.sign(message.digest)
      };
      
      await this.broadcast(commitMsg);
    }
  }

  private async handleCommit(message: ConsensusMessage): Promise<void> {
    // Store COMMIT message
    const key = `${message.view}-${message.sequence}`;
    if (!this.state.commits.has(key)) {
      this.state.commits.set(key, new Map());
    }
    this.state.commits.get(key)!.set(message.nodeId, message);
    
    // Check if we have 2f+1 matching COMMIT messages
    const commits = this.state.commits.get(key)!;
    if (commits.size >= 2 * this.f + 1) {
      // Execute request
      await this.executeRequest(message.digest);
      
      // Mark as committed
      this.state.phase = 'COMMITTED';
      
      // Clean up
      this.state.prepares.delete(key);
      this.state.commits.delete(key);
    }
  }

  private async executeRequest(digest: string): Promise<void> {
    // Find request by digest
    let targetRequest: Request | undefined;
    for (const [id, request] of this.pendingRequests) {
      if (this.crypto.hash(JSON.stringify(request)) === digest) {
        targetRequest = request;
        break;
      }
    }
    
    if (!targetRequest) {
      console.error('Request not found for digest:', digest);
      return;
    }
    
    // Mark as committed
    this.committedRequests.add(targetRequest.id);
    this.pendingRequests.delete(targetRequest.id);
    
    // Request will be stored in permanent storage
    console.log('Request committed:', targetRequest.id);
  }

  private async broadcast(message: ConsensusMessage): Promise<void> {
    const promises = [];
    
    for (const [nodeId, node] of this.nodes) {
      if (nodeId !== this.nodeId && node.isActive) {
        promises.push(this.sendMessage(node, message));
      }
    }
    
    await Promise.all(promises);
  }

  private async sendMessage(node: Node, message: ConsensusMessage): Promise<void> {
    // In production, send via network
    // For testing, simulate message delivery
    console.log(`Sending ${message.type} to ${node.id}`);
  }

  private async forwardToPrimary(request: Request): Promise<void> {
    const primary = this.getPrimaryNode();
    if (primary) {
      await this.sendMessage(primary, {
        type: 'PRE_PREPARE',
        view: this.state.view,
        sequence: 0,
        digest: '',
        nodeId: this.nodeId,
        signature: '',
        token: request.token
      });
    }
  }

  private updatePrimary(): void {
    const primaryIndex = this.state.view % this.nodes.size;
    const nodeIds = Array.from(this.nodes.keys()).sort();
    this.isPrimary = nodeIds[primaryIndex] === this.nodeId;
  }

  private getPrimaryNode(): Node | undefined {
    const primaryIndex = this.state.view % this.nodes.size;
    const nodeIds = Array.from(this.nodes.keys()).sort();
    return this.nodes.get(nodeIds[primaryIndex]);
  }

  /**
   * View change protocol for fault tolerance
   */
  async initiateViewChange(): Promise<void> {
    this.state.view++;
    this.state.phase = 'IDLE';
    this.state.prepares.clear();
    this.state.commits.clear();
    this.updatePrimary();
    
    console.log(`View changed to ${this.state.view}, primary: ${this.isPrimary}`);
  }

  /**
   * Get consensus metrics
   */
  getMetrics(): {
    currentView: number;
    currentSequence: number;
    pendingRequests: number;
    committedRequests: number;
    byzantineTolerance: number;
  } {
    return {
      currentView: this.state.view,
      currentSequence: this.state.sequence,
      pendingRequests: this.pendingRequests.size,
      committedRequests: this.committedRequests.size,
      byzantineTolerance: this.f
    };
  }
}