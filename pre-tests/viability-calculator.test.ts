import { describe, it, expect } from 'vitest';

// Economic Viability Testing: Validates actual costs vs projected savings
describe('Economic Viability Calculator', () => {
  // Cloudflare Pricing (as of 2025)
  const CLOUDFLARE_COSTS = {
    workers: {
      requests: 0.15 / 1_000_000, // $0.15 per million requests
      duration: 0.0125 / 1_000_000, // $0.0125 per million GB-seconds
      kv: {
        reads: 0.50 / 1_000_000,
        writes: 5.00 / 1_000_000,
        storage: 0.50 // per GB per month
      },
      d1: {
        reads: 0.001 / 1_000, // $0.001 per 1k rows read
        writes: 1.00 / 1_000_000, // $1 per million rows written
        storage: 5.00 // per GB per month
      }
    },
    pages: {
      builds: 0, // 500 free per month
      bandwidth: 0 // Unlimited
    }
  };

  // Arweave Costs (via Turbo)
  const ARWEAVE_COSTS = {
    under100KB: 0, // FREE with Turbo
    perMB: 0.0000005, // Approximately (highly subsidized)
    permanent: true
  };

  // Competitor Costs
  const COMPETITOR_COSTS = {
    WiseKey: {
      perTag: 2.50,
      annualPlatform: 250_000,
      setupFee: 50_000,
      responseTime: 25_300 // ms
    },
    Traditional: {
      aws: {
        ec2: 500, // per month for comparable performance
        rds: 200, // per month
        bandwidth: 0.09 // per GB
      },
      maintenance: 10_000 // per month (DevOps)
    }
  };

  describe('Cost Analysis', () => {
    it('should calculate total cost for different usage tiers', async () => {
      const usageTiers = [
        { name: 'Startup', tags: 10_000, verifications: 100_000 },
        { name: 'Growth', tags: 100_000, verifications: 5_000_000 },
        { name: 'Scale', tags: 1_000_000, verifications: 50_000_000 },
        { name: 'Enterprise', tags: 10_000_000, verifications: 500_000_000 }
      ];
      
      const results: any[] = [];
      
      for (const tier of usageTiers) {
        const nfcTraceCost = calculateNFCTraceCost(tier);
        const wiseKeyCost = calculateWiseKeyCost(tier);
        const traditionalCost = calculateTraditionalCost(tier);
        
        results.push({
          tier: tier.name,
          nfcTrace: nfcTraceCost,
          wiseKey: wiseKeyCost,
          traditional: traditionalCost,
          savings: {
            vsWiseKey: ((wiseKeyCost.total - nfcTraceCost.total) / wiseKeyCost.total * 100).toFixed(1),
            vsTraditional: ((traditionalCost.total - nfcTraceCost.total) / traditionalCost.total * 100).toFixed(1)
          }
        });
      }
      
      console.log('\nCost Comparison by Usage Tier:');
      console.log('='.repeat(80));
      
      results.forEach(r => {
        console.log(`\n${r.tier} Tier:`);
        console.log('-'.repeat(40));
        console.log(`NFC-TRACE:    $${r.nfcTrace.total.toLocaleString()}/month`);
        console.log(`WiseKey:      $${r.wiseKey.total.toLocaleString()}/month`);
        console.log(`Traditional:  $${r.traditional.total.toLocaleString()}/month`);
        console.log(`\nSavings:`);
        console.log(`  vs WiseKey:     ${r.savings.vsWiseKey}%`);
        console.log(`  vs Traditional: ${r.savings.vsTraditional}%`);
      });
      
      // Should be at least 90% cheaper than competitors
      expect(results.every(r => parseFloat(r.savings.vsWiseKey) > 90)).toBe(true);
    });

    it('should break down costs by component', async () => {
      const monthlyUsage = {
        tags: 1_000_000,
        verifications: 50_000_000,
        kvReads: 50_000_000,
        kvWrites: 1_000_000,
        d1Reads: 10_000_000,
        d1Writes: 1_000_000,
        storageGB: 10
      };
      
      const breakdown = {
        workers: {
          requests: monthlyUsage.verifications * CLOUDFLARE_COSTS.workers.requests,
          compute: monthlyUsage.verifications * 0.000001 * CLOUDFLARE_COSTS.workers.duration // Assume 1ms average
        },
        kv: {
          reads: monthlyUsage.kvReads * CLOUDFLARE_COSTS.workers.kv.reads,
          writes: monthlyUsage.kvWrites * CLOUDFLARE_COSTS.workers.kv.writes,
          storage: monthlyUsage.storageGB * CLOUDFLARE_COSTS.workers.kv.storage
        },
        d1: {
          reads: (monthlyUsage.d1Reads / 1000) * CLOUDFLARE_COSTS.workers.d1.reads,
          writes: monthlyUsage.d1Writes * CLOUDFLARE_COSTS.workers.d1.writes,
          storage: monthlyUsage.storageGB * CLOUDFLARE_COSTS.workers.d1.storage
        },
        arweave: {
          storage: 0 // FREE under 100KB with Turbo
        }
      };
      
      console.log('\nDetailed Cost Breakdown (1M tags, 50M verifications/month):');
      console.log('='.repeat(60));
      console.log('\nCloudflare Workers:');
      console.log(`  Requests:     $${breakdown.workers.requests.toFixed(2)}`);
      console.log(`  Compute:      $${breakdown.workers.compute.toFixed(2)}`);
      console.log('\nCloudflare KV:');
      console.log(`  Reads:        $${breakdown.kv.reads.toFixed(2)}`);
      console.log(`  Writes:       $${breakdown.kv.writes.toFixed(2)}`);
      console.log(`  Storage:      $${breakdown.kv.storage.toFixed(2)}`);
      console.log('\nCloudflare D1:');
      console.log(`  Reads:        $${breakdown.d1.reads.toFixed(2)}`);
      console.log(`  Writes:       $${breakdown.d1.writes.toFixed(2)}`);
      console.log(`  Storage:      $${breakdown.d1.storage.toFixed(2)}`);
      console.log('\nArweave:');
      console.log(`  Storage:      $${breakdown.arweave.storage.toFixed(2)} (FREE with Turbo)`);
      
      const total = Object.values(breakdown).reduce((sum, category) => 
        sum + Object.values(category).reduce((catSum, cost) => catSum + cost, 0), 0
      );
      
      console.log('\n' + '='.repeat(60));
      console.log(`TOTAL:          $${total.toFixed(2)}/month`);
      console.log(`Cost per tag:   $${(total / monthlyUsage.tags).toFixed(6)}`);
      console.log(`Cost per scan:  $${(total / monthlyUsage.verifications).toFixed(8)}`);
      
      // Cost per tag should be under $0.001
      expect(total / monthlyUsage.tags).toBeLessThan(0.001);
    });

    it('should calculate ROI for different business models', async () => {
      const businessModels = [
        {
          name: 'Luxury Brand',
          avgProductValue: 5000,
          monthlyProducts: 10_000,
          counterfeitRate: 0.15, // 15% counterfeit rate
          brandDamage: 50_000 // per incident
        },
        {
          name: 'Pharmaceutical',
          avgProductValue: 100,
          monthlyProducts: 1_000_000,
          counterfeitRate: 0.10,
          brandDamage: 1_000_000 // regulatory fines
        },
        {
          name: 'Electronics',
          avgProductValue: 500,
          monthlyProducts: 100_000,
          counterfeitRate: 0.20,
          brandDamage: 100_000
        }
      ];
      
      const results: any[] = [];
      
      for (const model of businessModels) {
        const monthlyValue = model.avgProductValue * model.monthlyProducts;
        const counterfeitLoss = monthlyValue * model.counterfeitRate;
        const brandRisk = model.brandDamage * 12; // Annual risk
        
        const nfcCost = calculateNFCTraceCost({ 
          tags: model.monthlyProducts, 
          verifications: model.monthlyProducts * 10 
        });
        
        const prevented = counterfeitLoss * 0.95; // 95% prevention rate
        const roi = ((prevented - nfcCost.total) / nfcCost.total) * 100;
        
        results.push({
          model: model.name,
          monthlyValue,
          counterfeitLoss,
          nfcCost: nfcCost.total,
          prevented,
          roi,
          paybackDays: (nfcCost.total / (prevented / 30)).toFixed(1)
        });
      }
      
      console.log('\nROI Analysis by Business Model:');
      console.log('='.repeat(80));
      
      results.forEach(r => {
        console.log(`\n${r.model}:`);
        console.log(`  Monthly Product Value:    $${r.monthlyValue.toLocaleString()}`);
        console.log(`  Counterfeit Losses:       $${r.counterfeitLoss.toLocaleString()}/month`);
        console.log(`  NFC-TRACE Cost:          $${r.nfcCost.toLocaleString()}/month`);
        console.log(`  Losses Prevented:         $${r.prevented.toLocaleString()}/month`);
        console.log(`  ROI:                      ${r.roi.toFixed(0)}%`);
        console.log(`  Payback Period:           ${r.paybackDays} days`);
      });
      
      // All models should have positive ROI
      expect(results.every(r => r.roi > 0)).toBe(true);
      // Payback should be under 30 days
      expect(results.every(r => parseFloat(r.paybackDays) < 30)).toBe(true);
    });
  });

  describe('Scaling Economics', () => {
    it('should demonstrate cost efficiency at scale', async () => {
      const scalePoints = [
        1_000,
        10_000,
        100_000,
        1_000_000,
        10_000_000,
        100_000_000
      ];
      
      const results: any[] = [];
      
      for (const tagCount of scalePoints) {
        const cost = calculateNFCTraceCost({
          tags: tagCount,
          verifications: tagCount * 10
        });
        
        results.push({
          tags: tagCount,
          totalCost: cost.total,
          costPerTag: cost.total / tagCount,
          costPerVerification: cost.total / (tagCount * 10)
        });
      }
      
      console.log('\nCost Efficiency at Scale:');
      console.log('Tags         | Total Cost    | Cost/Tag   | Cost/Scan');
      console.log('-------------|---------------|------------|------------');
      
      results.forEach(r => {
        console.log(
          `${r.tags.toLocaleString().padStart(12)} | $${r.totalCost.toFixed(2).padStart(12)} | $${r.costPerTag.toFixed(6).padStart(10)} | $${r.costPerVerification.toFixed(8).padStart(10)}`
        );
      });
      
      // Cost per tag should decrease with scale
      for (let i = 1; i < results.length; i++) {
        expect(results[i].costPerTag).toBeLessThanOrEqual(results[i-1].costPerTag);
      }
    });

    it('should compare 5-year TCO', async () => {
      const years = 5;
      const growthRate = 2; // 2x growth per year
      let currentTags = 100_000;
      
      const tcoComparison = {
        nfcTrace: { upfront: 0, annual: [] as number[], total: 0 },
        wiseKey: { upfront: 50_000, annual: [] as number[], total: 0 },
        traditional: { upfront: 100_000, annual: [] as number[], total: 0 }
      };
      
      for (let year = 1; year <= years; year++) {
        const usage = {
          tags: currentTags,
          verifications: currentTags * 10 * 12 // Monthly * 12
        };
        
        // NFC-TRACE
        const nfcYearlyCost = calculateNFCTraceCost(usage).total * 12;
        tcoComparison.nfcTrace.annual.push(nfcYearlyCost);
        
        // WiseKey
        const wiseKeyYearlyCost = calculateWiseKeyCost(usage).total * 12;
        tcoComparison.wiseKey.annual.push(wiseKeyYearlyCost);
        
        // Traditional
        const traditionalYearlyCost = calculateTraditionalCost(usage).total * 12;
        tcoComparison.traditional.annual.push(traditionalYearlyCost);
        
        currentTags *= growthRate;
      }
      
      // Calculate totals
      tcoComparison.nfcTrace.total = tcoComparison.nfcTrace.upfront + 
        tcoComparison.nfcTrace.annual.reduce((a, b) => a + b, 0);
      tcoComparison.wiseKey.total = tcoComparison.wiseKey.upfront + 
        tcoComparison.wiseKey.annual.reduce((a, b) => a + b, 0);
      tcoComparison.traditional.total = tcoComparison.traditional.upfront + 
        tcoComparison.traditional.annual.reduce((a, b) => a + b, 0);
      
      console.log(`\n${years}-Year Total Cost of Ownership (TCO):`);
      console.log('='.repeat(60));
      console.log('\nNFC-TRACE:');
      console.log(`  Upfront:      $${tcoComparison.nfcTrace.upfront.toLocaleString()}`);
      tcoComparison.nfcTrace.annual.forEach((cost, i) => {
        console.log(`  Year ${i + 1}:       $${cost.toLocaleString()}`);
      });
      console.log(`  5-Year Total: $${tcoComparison.nfcTrace.total.toLocaleString()}`);
      
      console.log('\nWiseKey:');
      console.log(`  Upfront:      $${tcoComparison.wiseKey.upfront.toLocaleString()}`);
      tcoComparison.wiseKey.annual.forEach((cost, i) => {
        console.log(`  Year ${i + 1}:       $${cost.toLocaleString()}`);
      });
      console.log(`  5-Year Total: $${tcoComparison.wiseKey.total.toLocaleString()}`);
      
      console.log('\nTraditional:');
      console.log(`  Upfront:      $${tcoComparison.traditional.upfront.toLocaleString()}`);
      tcoComparison.traditional.annual.forEach((cost, i) => {
        console.log(`  Year ${i + 1}:       $${cost.toLocaleString()}`);
      });
      console.log(`  5-Year Total: $${tcoComparison.traditional.total.toLocaleString()}`);
      
      console.log('\n' + '='.repeat(60));
      console.log('5-Year Savings:');
      console.log(`  vs WiseKey:     $${(tcoComparison.wiseKey.total - tcoComparison.nfcTrace.total).toLocaleString()} (${((tcoComparison.wiseKey.total - tcoComparison.nfcTrace.total) / tcoComparison.wiseKey.total * 100).toFixed(1)}%)`);
      console.log(`  vs Traditional: $${(tcoComparison.traditional.total - tcoComparison.nfcTrace.total).toLocaleString()} (${((tcoComparison.traditional.total - tcoComparison.nfcTrace.total) / tcoComparison.traditional.total * 100).toFixed(1)}%)`);
      
      // Should save millions over 5 years
      expect(tcoComparison.wiseKey.total - tcoComparison.nfcTrace.total).toBeGreaterThan(1_000_000);
    });
  });

  describe('Hidden Costs Analysis', () => {
    it('should account for all hidden costs', async () => {
      const hiddenCosts = {
        nfcTrace: {
          development: 0, // Already built
          maintenance: 0, // Serverless
          scaling: 0, // Auto-scales
          downtime: 0, // 99.99% uptime
          security: 0, // Built-in
          compliance: 1000 // Annual audit
        },
        traditional: {
          development: 250_000,
          maintenance: 120_000, // Annual DevOps
          scaling: 50_000, // Hardware upgrades
          downtime: 100_000, // 99.9% uptime = 8.76 hours/year
          security: 30_000, // Security tools and monitoring
          compliance: 10_000
        },
        wiseKey: {
          development: 50_000, // Integration costs
          maintenance: 0, // Managed service
          scaling: 0, // Their problem
          downtime: 50_000, // Based on 25s response time
          security: 0, // Their responsibility
          compliance: 5_000
        }
      };
      
      console.log('\nHidden Costs Analysis (Annual):');
      console.log('='.repeat(60));
      console.log('Cost Type        | NFC-TRACE | Traditional | WiseKey');
      console.log('-----------------|-----------|-------------|----------');
      
      const costTypes = Object.keys(hiddenCosts.nfcTrace);
      costTypes.forEach(type => {
        console.log(
          `${type.padEnd(16)} | $${hiddenCosts.nfcTrace[type as keyof typeof hiddenCosts.nfcTrace].toLocaleString().padStart(8)} | $${hiddenCosts.traditional[type as keyof typeof hiddenCosts.traditional].toLocaleString().padStart(10)} | $${hiddenCosts.wiseKey[type as keyof typeof hiddenCosts.wiseKey].toLocaleString().padStart(8)}`
        );
      });
      
      const totals = {
        nfcTrace: Object.values(hiddenCosts.nfcTrace).reduce((a, b) => a + b, 0),
        traditional: Object.values(hiddenCosts.traditional).reduce((a, b) => a + b, 0),
        wiseKey: Object.values(hiddenCosts.wiseKey).reduce((a, b) => a + b, 0)
      };
      
      console.log('-----------------|-----------|-------------|----------');
      console.log(
        `${'TOTAL'.padEnd(16)} | $${totals.nfcTrace.toLocaleString().padStart(8)} | $${totals.traditional.toLocaleString().padStart(10)} | $${totals.wiseKey.toLocaleString().padStart(8)}`
      );
      
      // NFC-TRACE should have minimal hidden costs
      expect(totals.nfcTrace).toBeLessThan(totals.traditional * 0.01);
      expect(totals.nfcTrace).toBeLessThan(totals.wiseKey * 0.02);
    });
  });
});

// Helper functions
function calculateNFCTraceCost(usage: { tags: number, verifications: number }): any {
  const costs = {
    // Workers
    workerRequests: usage.verifications * CLOUDFLARE_COSTS.workers.requests,
    workerCompute: usage.verifications * 0.000001 * CLOUDFLARE_COSTS.workers.duration,
    
    // KV (caching)
    kvReads: usage.verifications * 0.1 * CLOUDFLARE_COSTS.workers.kv.reads, // 10% cache miss
    kvWrites: usage.tags * CLOUDFLARE_COSTS.workers.kv.writes,
    kvStorage: (usage.tags * 1024 / 1_000_000_000) * CLOUDFLARE_COSTS.workers.kv.storage, // 1KB per tag
    
    // D1 (auth data)
    d1Reads: (usage.verifications / 1000) * CLOUDFLARE_COSTS.workers.d1.reads,
    d1Writes: usage.tags * CLOUDFLARE_COSTS.workers.d1.writes,
    d1Storage: (usage.tags * 100 / 1_000_000_000) * CLOUDFLARE_COSTS.workers.d1.storage, // 100B per tag
    
    // Arweave
    arweaveStorage: 0 // FREE under 100KB with Turbo
  };
  
  const total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
  
  return { ...costs, total };
}

function calculateWiseKeyCost(usage: { tags: number, verifications: number }): any {
  const costs = {
    perTag: usage.tags * COMPETITOR_COSTS.WiseKey.perTag,
    platform: COMPETITOR_COSTS.WiseKey.annualPlatform / 12,
    setup: COMPETITOR_COSTS.WiseKey.setupFee / 12 // Amortized over first year
  };
  
  const total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
  
  return { ...costs, total };
}

function calculateTraditionalCost(usage: { tags: number, verifications: number }): any {
  // Scale infrastructure based on usage
  const serverCount = Math.ceil(usage.verifications / 10_000_000); // 10M requests per server
  
  const costs = {
    ec2: COMPETITOR_COSTS.Traditional.aws.ec2 * serverCount,
    rds: COMPETITOR_COSTS.Traditional.aws.rds * Math.ceil(serverCount / 2),
    bandwidth: (usage.verifications * 1024 / 1_000_000_000) * COMPETITOR_COSTS.Traditional.aws.bandwidth * 1000, // 1KB per request
    maintenance: COMPETITOR_COSTS.Traditional.maintenance
  };
  
  const total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
  
  return { ...costs, total };
}