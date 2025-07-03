export interface ConsensusMessage {
  type: 'PREPARE' | 'PREPARE_VOTE' | 'COMMIT' | 'COMMIT_VOTE' | 'VIEW_CHANGE' | 'HEARTBEAT';
  nodeId: string;
  view: number;
  proposalId?: string;
  data?: any;
  timestamp: number;
  signature: string;
}

export interface NodeInfo {
  id: string;
  address: string;
  port: number;
  lastSeen: number;
  publicKey: string;
}

export interface ConsensusVote {
  nodeId: string;
  proposalId: string;
  vote: boolean;
  signature: string;
}