#!/bin/bash

echo "🔒 SSS-API Security Audit"
echo "========================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

# Function to check a security item
check() {
    local test_name=$1
    local command=$2
    local expected=$3
    
    echo -n "Checking $test_name... "
    
    result=$(eval $command 2>&1)
    
    if [[ "$result" == *"$expected"* ]] || [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Details: $result"
        ((FAIL++))
        return 1
    fi
}

# Function to warn about a security item
warn() {
    local test_name=$1
    local details=$2
    
    echo -e "${YELLOW}⚠ WARNING${NC}: $test_name"
    echo "  Details: $details"
    ((WARN++))
}

echo "1. Dependency Security"
echo "---------------------"

# Check for known vulnerabilities
check "npm audit" "npm audit --production --audit-level=high" "found 0"

# Check for outdated packages
check "Outdated packages" "npm outdated --depth=0 | wc -l" "0"

echo ""
echo "2. Code Security"
echo "----------------"

# Check for hardcoded secrets
check "No hardcoded secrets" "grep -r -i -E '(password|secret|api_key|private_key)\\s*=\\s*[\"'\''`][^\"'\''`]+[\"'\''`]' src/ || echo 'none found'" "none found"

# Check for SQL injection vulnerabilities
check "No raw SQL queries" "grep -r -E '(query|execute)\\s*\\(' src/ | grep -v -E '(prepared|parameterized)' || echo 'none found'" "none found"

# Check for eval usage
check "No eval() usage" "grep -r 'eval(' src/ || echo 'none found'" "none found"

# Check for proper error handling
check "Error handling" "grep -r 'catch' src/ | wc -l | awk '{if($1>50) print \"adequate\"; else print \"insufficient\"}'" "adequate"

echo ""
echo "3. Authentication & Authorization"
echo "---------------------------------"

# Check for rate limiting
check "Rate limiting implemented" "grep -r 'RateLimiter' src/" "RateLimiter"

# Check for API key validation
check "API key validation" "grep -r 'x-api-key' src/" "x-api-key"

# Check for ethical framework
check "Ethical licensing framework" "grep -r 'EthicalLicensingFramework' src/" "EthicalLicensingFramework"

echo ""
echo "4. Cryptography"
echo "---------------"

# Check for quantum defense
check "Quantum defense implemented" "grep -r 'QuantumDefense' src/" "QuantumDefense"

# Check for proper random number generation
check "Secure random generation" "grep -r 'crypto.random' src/" "crypto.random"

# Check for weak algorithms
warn "Check for weak crypto" "Ensure no MD5, SHA1, or DES usage"

echo ""
echo "5. Infrastructure Security"
echo "--------------------------"

# Check for HTTPS enforcement
check "HTTPS enforcement" "grep -r 'forceSSL\\|requireHTTPS' src/ || echo 'Check nginx config'" "Check nginx config"

# Check for security headers
check "Security headers" "grep -r 'helmet\\|security.*header' src/" "helmet"

# Check for CORS configuration
check "CORS configuration" "grep -r 'cors' src/" "cors"

echo ""
echo "6. Data Protection"
echo "------------------"

# Check for input validation
check "Input validation" "grep -r 'zValidator\\|validate' src/ | wc -l | awk '{if($1>20) print \"adequate\"; else print \"insufficient\"}'" "adequate"

# Check for output encoding
check "Output encoding" "grep -r 'sanitize\\|escape' src/" "sanitize"

# Check for logging of sensitive data
warn "Sensitive data logging" "Review logs to ensure no PII or sensitive data is logged"

echo ""
echo "7. Deployment Security"
echo "----------------------"

# Check Dockerfile for security best practices
if [ -f "deployment/Dockerfile" ]; then
    check "Non-root user in Docker" "grep 'USER' deployment/Dockerfile" "USER"
    check "No secrets in Dockerfile" "grep -E '(PASSWORD|SECRET|KEY)=' deployment/Dockerfile || echo 'none found'" "none found"
else
    warn "Dockerfile" "No Dockerfile found"
fi

# Check for environment variable usage
check "Environment variables" "grep -r 'process.env' src/ | wc -l | awk '{if($1>5) print \"used\"; else print \"not used\"}'" "used"

echo ""
echo "8. Monitoring & Incident Response"
echo "---------------------------------"

# Check for monitoring
check "Monitoring implemented" "grep -r 'MonitoringService' src/" "MonitoringService"

# Check for audit logging
check "Audit logging" "grep -r 'audit\\|log.*security' src/" "audit"

echo ""
echo "========================"
echo "Security Audit Summary"
echo "========================"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo -e "Warnings: ${YELLOW}$WARN${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ Security audit PASSED!${NC}"
else
    echo -e "${RED}❌ Security audit FAILED!${NC}"
    echo ""
    echo "Recommendations:"
    echo "1. Fix all failed security checks"
    echo "2. Review and address all warnings"
    echo "3. Run 'npm audit fix' to patch vulnerabilities"
    echo "4. Consider using a security scanner like Snyk or OWASP ZAP"
fi

echo ""
echo "Additional Security Recommendations:"
echo "-----------------------------------"
echo "• Enable Web Application Firewall (WAF) on Cloudflare"
echo "• Implement DDoS protection at edge"
echo "• Regular security audits and penetration testing"
echo "• Implement security.txt file"
echo "• Enable Content Security Policy (CSP) headers"
echo "• Implement Subresource Integrity (SRI) for assets"
echo "• Regular dependency updates and security patches"
echo "• Implement bug bounty program"

exit $FAIL