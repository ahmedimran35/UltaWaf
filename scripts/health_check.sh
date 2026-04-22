#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛡️ UltraShield WAF Health Status${NC}"
echo "======================================="

check_backend() {
    echo -n "Backend: "
    if curl -s -f http://localhost:8000/health &> /dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy${NC}"
        return 1
    fi
}

check_frontend() {
    echo -n "Frontend: "
    if curl -s -f http://localhost:5173 &> /dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy${NC}"
        return 1
    fi
}

check_postgres() {
    echo -n "PostgreSQL: "
    if docker-compose exec -T postgres pg_isready -U waf &> /dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy${NC}"
        return 1
    fi
}

check_redis() {
    echo -n "Redis: "
    if docker-compose exec -T redis redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Unhealthy${NC}"
        return 1
    fi
}

main() {
    services=0
    healthy=0
    
    check_backend && ((healthy++)) || ((services++))
    check_frontend && ((healthy++)) || ((services++))
    check_postgres && ((healthy++)) || ((services++))
    check_redis && ((healthy++)) || ((services++))
    
    echo ""
    echo "Healthy: $healthy / 4"
    
    if [ $healthy -eq 4 ]; then
        echo -e "${GREEN}✅ All services healthy${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some services unhealthy${NC}"
        exit 1
    fi
}

main "$@"