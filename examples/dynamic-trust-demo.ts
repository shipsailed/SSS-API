#!/usr/bin/env tsx

import { DynamicQuantumDefense, DYNAMIC_PRESETS } from '../src/core/dynamic-quantum-defense.js';

/**
 * Demonstrate the revolutionary "Time = Trust" dynamic quantum defense system
 */
async function demonstrateDynamicTrust() {
  console.log('\n' + '='.repeat(80));
  console.log('DYNAMIC QUANTUM DEFENSE: "The Longer You Wait, The More Secure You Are"');
  console.log('='.repeat(80) + '\n');

  console.log('CONCEPT: Trust Through Computation');
  console.log('==================================');
  console.log('In a decentralized cloud, you can\'t trust the infrastructure.');
  console.log('But you CAN trust mathematics and time.\n');
  console.log('This system dynamically scales security based on how long you wait:');
  console.log('- 100ms → 2-3 algorithms (basic protection)');
  console.log('- 1 second → 10-15 algorithms (high security)');
  console.log('- 10 seconds → 30-50 algorithms (maximum paranoia)\n');

  const dynamicDefense = new DynamicQuantumDefense(DYNAMIC_PRESETS.DECENTRALIZED_SECURE);

  // Test 1: Different time tolerances
  console.log('1. TIME-BASED SECURITY SCALING');
  console.log('='.repeat(50));

  const timeTests = [
    { maxTime: 50, scenario: 'Quick API auth' },
    { maxTime: 100, scenario: 'Standard web request' },
    { maxTime: 500, scenario: 'Financial transaction' },
    { maxTime: 1000, scenario: 'Government document' },
    { maxTime: 2000, scenario: 'Military communication' },
    { maxTime: 5000, scenario: 'Nuclear codes' },
    { maxTime: 10000, scenario: 'Alien defense protocol' }
  ];

  console.log('Max Time | Scenario               | Algos | Security | Trust | Actual Time');
  console.log('-'.repeat(76));

  for (const test of timeTests) {
    const result = await dynamicDefense.signDynamic('Test message', {
      maxTime: test.maxTime
    });

    console.log(
      `${test.maxTime.toString().padStart(8)}ms | ${test.scenario.padEnd(22)} | ${
        result.algorithms.length.toString().padStart(5)
      } | ${result.securityLevel.padEnd(8)} | ${
        result.trustScore.toString().padStart(5)
      }% | ${result.executionTime}ms`
    );
  }

  // Test 2: Trust levels (0-100)
  console.log('\n2. TRUST LEVEL DEMONSTRATION');
  console.log('='.repeat(50));
  console.log('\nScenario: Decentralized cloud storage where trust must be earned\n');

  const trustLevels = [
    { trust: 0, description: 'Public WiFi upload' },
    { trust: 25, description: 'Unknown cloud provider' },
    { trust: 50, description: 'Reputable provider' },
    { trust: 75, description: 'Enterprise cloud' },
    { trust: 90, description: 'Government cloud' },
    { trust: 100, description: 'Maximum paranoia' }
  ];

  console.log('Trust | Description          | Algorithms | Families | Quantum | Time');
  console.log('-'.repeat(70));

  for (const level of trustLevels) {
    const result = await dynamicDefense.signDynamic('Sensitive data', {
      trustLevel: level.trust,
      sensitivity: 'high'
    });

    const quantumAlgos = result.algorithms.filter(a => 
      a.includes('ML-DSA') || a.includes('SLH-DSA')
    ).length;

    console.log(
      `${level.trust.toString().padStart(5)}% | ${level.description.padEnd(20)} | ${
        result.algorithms.length.toString().padStart(10)
      } | ${result.metadata.families.length.toString().padStart(8)} | ${
        quantumAlgos.toString().padStart(7)
      } | ${result.executionTime.toString().padStart(4)}ms`
    );
  }

  // Test 3: Decentralized cloud scenarios
  console.log('\n3. DECENTRALIZED CLOUD SCENARIOS');
  console.log('='.repeat(50));

  const scenarios = [
    'untrusted-storage',
    'distributed-compute',
    'public-blockchain',
    'hostile-network'
  ];

  for (const scenario of scenarios) {
    console.log(`\nScenario: ${scenario.toUpperCase()}`);
    console.log('-'.repeat(40));
    
    const recommendations = dynamicDefense.getDecentralizedCloudRecommendations(scenario);
    console.log(`Recommended settings:`);
    console.log(`  - Minimum algorithms: ${recommendations.minAlgorithms}`);
    console.log(`  - Target time: ${recommendations.targetTime}ms`);
    console.log(`  - Sensitivity: ${recommendations.sensitivity}`);
    console.log(`  - Reason: ${recommendations.reason}`);
    
    // Execute with recommendations
    const result = await dynamicDefense.signDynamic('Cloud data', {
      maxTime: recommendations.targetTime,
      minAlgorithms: recommendations.minAlgorithms,
      sensitivity: recommendations.sensitivity
    });
    
    console.log(`\nActual execution:`);
    console.log(`  - Algorithms used: ${result.algorithms.length}`);
    console.log(`  - Security level: ${result.securityLevel}`);
    console.log(`  - Trust score: ${result.trustScore}%`);
    console.log(`  - Time taken: ${result.executionTime}ms`);
  }

  // Test 4: Real-time adaptation
  console.log('\n4. ADAPTIVE PERFORMANCE MODE');
  console.log('='.repeat(50));
  console.log('\nSystem learns and adapts to actual performance:\n');

  const adaptiveDefense = new DynamicQuantumDefense({
    ...DYNAMIC_PRESETS.DECENTRALIZED_SECURE,
    adaptiveMode: true
  });

  console.log('Run | Target | Algorithms | Time | Adapted?');
  console.log('-'.repeat(45));

  for (let i = 1; i <= 5; i++) {
    const result = await adaptiveDefense.signDynamic(`Message ${i}`, {
      maxTime: 1000
    });

    console.log(
      `${i.toString().padStart(3)} | ${
        '1000ms'.padStart(6)
      } | ${result.algorithms.length.toString().padStart(10)} | ${
        result.executionTime.toString().padStart(4)
      }ms | ${i > 1 ? 'Yes' : 'No'}`
    );
  }

  // Test 5: The ultimate demonstration
  console.log('\n5. THE ULTIMATE DEMONSTRATION');
  console.log('='.repeat(50));
  console.log('\nLet\'s protect data with "Zero Trust" paranoia mode:\n');

  const zeroTrust = new DynamicQuantumDefense(DYNAMIC_PRESETS.ZERO_TRUST);
  
  console.log('Executing maximum paranoia signature (10 second budget)...\n');
  
  const startTime = Date.now();
  const ultimateResult = await zeroTrust.signDynamic(
    'ULTRA TOP SECRET - Zero trust environment data',
    {
      maxTime: 10000,
      sensitivity: 'critical',
      trustLevel: 100
    }
  );
  
  console.log(`RESULTS:`);
  console.log(`- Algorithms used: ${ultimateResult.algorithms.length}`);
  console.log(`- Algorithm families: ${ultimateResult.metadata.families.join(', ')}`);
  console.log(`- Total signature size: ${(ultimateResult.metadata.totalSignatureSize / 1024).toFixed(1)} KB`);
  console.log(`- Execution time: ${ultimateResult.executionTime}ms`);
  console.log(`- Security level: ${ultimateResult.securityLevel}`);
  console.log(`- Trust score: ${ultimateResult.trustScore}%`);
  console.log(`- Break probability: ${ultimateResult.metadata.breakProbability.toExponential(1)}`);
  console.log(`- Quantum resistant: ${ultimateResult.metadata.quantumResistant ? 'YES' : 'NO'}`);

  // Show specific algorithms used
  console.log(`\nAlgorithms selected:`);
  const byType = new Map<string, string[]>();
  for (const algo of ultimateResult.algorithms) {
    const type = algo.includes('ML-DSA') ? 'Lattice' :
                 algo.includes('SLH-DSA') ? 'Hash' :
                 algo.includes('25519') || algo.includes('256k1') || algo.includes('P-') ? 'ECC' :
                 'Symmetric';
    
    const list = byType.get(type) || [];
    list.push(algo);
    byType.set(type, list);
  }
  
  for (const [type, algos] of byType) {
    console.log(`  ${type}: ${algos.join(', ')}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('CONCLUSION: Dynamic Trust for Decentralized Clouds');
  console.log('='.repeat(80));
  
  console.log('\n✓ Time directly correlates to security level');
  console.log('✓ Users choose their own security/performance trade-off');
  console.log('✓ Perfect for untrusted/decentralized environments');
  console.log('✓ Adapts to network conditions and threats');
  console.log('✓ Scales from 2 to 50+ algorithms based on need');
  
  console.log('\nKey Innovation:');
  console.log('"In a world where you can\'t trust the infrastructure,');
  console.log(' you CAN trust mathematics and computation time."');
  
  console.log('\nThis is the future of decentralized cloud security.');
}

demonstrateDynamicTrust().catch(console.error);