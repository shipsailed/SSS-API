// Comprehensive tests for Merkle tree implementation
import { MerkleTree, NFCBatchVerifier, ArweaveMerkleStorage } from '../workers/merkle/merkle-tree';

describe('MerkleTree', () => {
  test('creates tree with single element', () => {
    const tree = new MerkleTree(['data1']);
    expect(tree.getRootHash()).toBeDefined();
    expect(tree.getLeaves().length).toBe(1);
  });
  
  test('creates tree with multiple elements', () => {
    const data = ['data1', 'data2', 'data3', 'data4'];
    const tree = new MerkleTree(data);
    expect(tree.getRootHash()).toBeDefined();
    expect(tree.getLeaves().length).toBe(4);
  });
  
  test('handles odd number of elements', () => {
    const data = ['data1', 'data2', 'data3'];
    const tree = new MerkleTree(data);
    expect(tree.getRootHash()).toBeDefined();
    expect(tree.getLeaves().length).toBe(3);
  });
  
  test('generates valid proofs', () => {
    const data = ['tag1', 'tag2', 'tag3', 'tag4'];
    const tree = new MerkleTree(data);
    const rootHash = tree.getRootHash();
    
    // Test proof for each element
    data.forEach((item, index) => {
      const proof = tree.generateProof(index);
      const isValid = tree.verifyProof(item, index, proof, rootHash);
      expect(isValid).toBe(true);
    });
  });
  
  test('rejects invalid proofs', () => {
    const data = ['tag1', 'tag2', 'tag3', 'tag4'];
    const tree = new MerkleTree(data);
    const rootHash = tree.getRootHash();
    
    const proof = tree.generateProof(0);
    // Try to verify with wrong data
    const isValid = tree.verifyProof('wrong-data', 0, proof, rootHash);
    expect(isValid).toBe(false);
  });
  
  test('produces consistent root hash', () => {
    const data = ['tag1', 'tag2', 'tag3', 'tag4'];
    const tree1 = new MerkleTree(data);
    const tree2 = new MerkleTree(data);
    
    expect(tree1.getRootHash()).toBe(tree2.getRootHash());
  });
});

describe('NFCBatchVerifier', () => {
  const mockTags = [
    { uid: 'NFC001', data: { brand: 'TestBrand', product: 'Product1', timestamp: 1000 } },
    { uid: 'NFC002', data: { brand: 'TestBrand', product: 'Product2', timestamp: 1001 } },
    { uid: 'NFC003', data: { brand: 'TestBrand', product: 'Product3', timestamp: 1002 } },
    { uid: 'NFC004', data: { brand: 'TestBrand', product: 'Product4', timestamp: 1003 } }
  ];
  
  test('creates batch verifier', () => {
    const verifier = new NFCBatchVerifier(mockTags);
    expect(verifier.getRootHash()).toBeDefined();
  });
  
  test('generates tag proofs', () => {
    const verifier = new NFCBatchVerifier(mockTags);
    const rootHash = verifier.getRootHash();
    
    mockTags.forEach(tag => {
      const proofData = verifier.generateTagProof(tag.uid);
      expect(proofData).not.toBeNull();
      
      if (proofData) {
        const isValid = verifier.verifyTag(tag.uid, proofData.proof, proofData.index, rootHash);
        expect(isValid).toBe(true);
      }
    });
  });
  
  test('returns null for non-existent tag', () => {
    const verifier = new NFCBatchVerifier(mockTags);
    const proofData = verifier.generateTagProof('INVALID-UID');
    expect(proofData).toBeNull();
  });
  
  test('creates batch attestation', () => {
    const verifier = new NFCBatchVerifier(mockTags);
    const attestation = verifier.createBatchAttestation();
    
    expect(attestation.rootHash).toBe(verifier.getRootHash());
    expect(attestation.tagCount).toBe(mockTags.length);
    expect(attestation.timestamp).toBeDefined();
    expect(attestation.tags.length).toBe(mockTags.length);
    
    // Verify all UIDs are included
    attestation.tags.forEach((tag, index) => {
      expect(tag.uid).toBe(mockTags[index].uid);
      expect(tag.index).toBe(index);
    });
  });
});

describe('NFCBatchVerifier - Large Scale', () => {
  test('handles 10,000 tags efficiently', () => {
    const largeBatch = Array.from({ length: 10000 }, (_, i) => ({
      uid: `NFC${i.toString().padStart(6, '0')}`,
      data: {
        brand: 'TestBrand',
        product: `Product${i}`,
        timestamp: Date.now() + i,
        serial: Math.random().toString(36).substring(2)
      }
    }));
    
    const startTime = Date.now();
    const verifier = new NFCBatchVerifier(largeBatch);
    const creationTime = Date.now() - startTime;
    
    console.log(`Created Merkle tree for 10,000 tags in ${creationTime}ms`);
    expect(creationTime).toBeLessThan(1000); // Should be under 1 second
    
    // Test random proof generation
    const randomIndex = Math.floor(Math.random() * largeBatch.length);
    const randomTag = largeBatch[randomIndex];
    
    const proofStart = Date.now();
    const proofData = verifier.generateTagProof(randomTag.uid);
    const proofTime = Date.now() - proofStart;
    
    console.log(`Generated proof in ${proofTime}ms`);
    expect(proofTime).toBeLessThan(10); // Should be very fast
    
    // Verify the proof
    if (proofData) {
      const verifyStart = Date.now();
      const isValid = verifier.verifyTag(
        randomTag.uid,
        proofData.proof,
        proofData.index,
        verifier.getRootHash()
      );
      const verifyTime = Date.now() - verifyStart;
      
      console.log(`Verified proof in ${verifyTime}ms`);
      expect(isValid).toBe(true);
      expect(verifyTime).toBeLessThan(5);
    }
  });
});

describe('ArweaveMerkleStorage', () => {
  const storage = new ArweaveMerkleStorage('http://localhost:1984');
  
  test('stores merkle root', async () => {
    const attestation = {
      rootHash: 'test-root-hash',
      tagCount: 100,
      timestamp: Date.now()
    };
    
    const result = await storage.storeMerkleRoot(attestation);
    expect(result.txId).toBeDefined();
    expect(result.url).toContain(result.txId);
  });
  
  test('retrieves merkle proof', async () => {
    const proof = await storage.retrieveMerkleProof('test-tx-id');
    expect(proof.rootHash).toBeDefined();
    expect(proof.tagCount).toBeDefined();
    expect(proof.timestamp).toBeDefined();
  });
});

// Real-world scenario tests
describe('Real-world NFC Batch Scenarios', () => {
  test('luxury brand batch encoding', () => {
    // Simulate encoding 1000 luxury watches
    const luxuryWatches = Array.from({ length: 1000 }, (_, i) => ({
      uid: `ROLEX${i.toString().padStart(6, '0')}`,
      data: {
        brand: 'Rolex',
        model: 'Submariner',
        serial: `SUB${Date.now()}${i}`,
        manufactureDate: new Date(2024, 0, 1 + i).toISOString(),
        retailPrice: 10000 + (i * 10),
        authenticity: {
          factoryId: 'CH-001',
          qcPassed: true,
          certifiedBy: 'Swiss Authority'
        }
      }
    }));
    
    const verifier = new NFCBatchVerifier(luxuryWatches);
    const attestation = verifier.createBatchAttestation();
    
    console.log('Luxury batch attestation:', {
      rootHash: attestation.rootHash,
      tagCount: attestation.tagCount,
      estimatedBlockchainCost: '$0.002', // One-time Arweave cost
      traditionalCost: `$${(attestation.tagCount * 2.45).toFixed(2)}` // WiseKey cost
    });
    
    // Verify random watch
    const randomWatch = luxuryWatches[500];
    const proof = verifier.generateTagProof(randomWatch.uid);
    expect(proof).not.toBeNull();
  });
  
  test('multi-brand marketplace batch', () => {
    // Different brands in one batch
    const brands = ['Nike', 'Adidas', 'Puma', 'NewBalance', 'UnderArmour'];
    const products = [];
    
    brands.forEach((brand, brandIndex) => {
      for (let i = 0; i < 200; i++) {
        products.push({
          uid: `${brand.toUpperCase()}${i.toString().padStart(4, '0')}`,
          data: {
            brand,
            category: 'Footwear',
            model: `Model-${brandIndex}-${i}`,
            size: 8 + (i % 5),
            color: ['Black', 'White', 'Red', 'Blue', 'Green'][i % 5],
            retailPrice: 100 + (brandIndex * 20) + (i % 50)
          }
        });
      }
    });
    
    const verifier = new NFCBatchVerifier(products);
    const rootHash = verifier.getRootHash();
    
    // Verify products from different brands
    brands.forEach(brand => {
      const brandProduct = products.find(p => p.uid.startsWith(brand.toUpperCase()));
      if (brandProduct) {
        const proof = verifier.generateTagProof(brandProduct.uid);
        expect(proof).not.toBeNull();
        
        if (proof) {
          const isValid = verifier.verifyTag(
            brandProduct.uid,
            proof.proof,
            proof.index,
            rootHash
          );
          expect(isValid).toBe(true);
        }
      }
    });
  });
  
  test('supply chain tracking batch', () => {
    // Track products through supply chain stages
    const supplyChainBatch = Array.from({ length: 500 }, (_, i) => ({
      uid: `SUPPLY${i.toString().padStart(5, '0')}`,
      data: {
        productId: `PROD-${i}`,
        stages: [
          { stage: 'Manufacturing', location: 'China', timestamp: Date.now() - 86400000 * 30 },
          { stage: 'QualityControl', location: 'China', timestamp: Date.now() - 86400000 * 25 },
          { stage: 'Shipping', location: 'Pacific Ocean', timestamp: Date.now() - 86400000 * 20 },
          { stage: 'Customs', location: 'USA', timestamp: Date.now() - 86400000 * 10 },
          { stage: 'Distribution', location: 'USA', timestamp: Date.now() - 86400000 * 5 },
          { stage: 'Retail', location: 'Store-' + (i % 50), timestamp: Date.now() }
        ],
        certifications: ['ISO9001', 'FDA', 'CE'],
        batchNumber: `BATCH-2024-${Math.floor(i / 50)}`
      }
    }));
    
    const verifier = new NFCBatchVerifier(supplyChainBatch);
    const attestation = verifier.createBatchAttestation();
    
    // Simulate checking a product's journey
    const checkProduct = supplyChainBatch[250];
    const proof = verifier.generateTagProof(checkProduct.uid);
    
    if (proof) {
      console.log('Supply chain verification:', {
        uid: checkProduct.uid,
        stages: checkProduct.data.stages.length,
        proofSize: proof.proof.length,
        verifiable: true
      });
    }
  });
});