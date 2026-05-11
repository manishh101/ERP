#!/bin/bash


# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR" || exit 1

# Production Readiness Validation Script

echo "=========================================="
echo "Production Readiness Check"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 installed"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1 not found"
        ((FAIL++))
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1 missing"
        ((FAIL++))
    fi
}

echo "Checking Requirements..."
check_command "node"
check_command "npm"
check_command "docker"
check_command "docker-compose"
echo ""

echo "Checking Configuration Files..."
check_file ".env.production"
check_file ".env.development"
check_file ".dockerignore"
check_file "docker-compose.prod.yml"
check_file "server/Dockerfile"
check_file "client/Dockerfile"
check_file "client/nginx.conf"
echo ""

echo "Checking Documentation..."
check_file "DEPLOYMENT.md"
check_file "DEPLOYMENT_CHECKLIST.md"
check_file "PRODUCTION.md"
check_file "SCRIPTS.md"
check_file "NGINX_SSL.md"
echo ""

echo "Checking Build Outputs..."
check_file "server/dist/index.js"
check_file "client/dist/index.html"
echo ""

echo "Checking TypeScript Configuration..."
check_file "server/tsconfig.json"
check_file "client/tsconfig.app.json"
check_file "client/tsconfig.json"
echo ""

echo "Checking Dependencies..."
if grep -q '"compression"' server/package.json; then
    echo -e "${GREEN}✓${NC} compression middleware installed"
    ((PASS++))
else
    echo -e "${RED}✗${NC} compression middleware missing"
    ((FAIL++))
fi

if grep -q '"helmet"' server/package.json; then
    echo -e "${GREEN}✓${NC} helmet security installed"
    ((PASS++))
else
    echo -e "${RED}✗${NC} helmet security missing"
    ((FAIL++))
fi

if grep -q '"express-rate-limit"' server/package.json; then
    echo -e "${GREEN}✓${NC} rate limiting installed"
    ((PASS++))
else
    echo -e "${RED}✗${NC} rate limiting missing"
    ((FAIL++))
fi

echo ""
echo "=========================================="
echo "Summary: ${GREEN}$PASS checks passed${NC}, ${RED}$FAIL checks failed${NC}"
echo "=========================================="

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ Production ready!${NC}"
    exit 0
else
    echo -e "${RED}✗ Please address the above issues${NC}"
    exit 1
fi
