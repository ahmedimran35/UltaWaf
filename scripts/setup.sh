#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛡️  UltraShield WAF Setup Wizard${NC}"
echo "======================================="

check_docker() {
    echo -e "\n${YELLOW}Checking Docker...${NC}"
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not installed. Install from https://docker.com${NC}"
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose not installed. Install from https://docker.com${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker and Docker Compose available${NC}"
}

check_ports() {
    echo -e "\n${YELLOW}Checking required ports...${NC}"
    PORTS=(80 443 5432 6379 5173 5555)
    for port in "${PORTS[@]}"; do
        if lsof -i :$port &> /dev/null; then
            echo -e "${RED}⚠️  Port $port is in use${NC}"
        else
            echo -e "${GREEN}✅ Port $port is available${NC}"
        fi
    done
}

generate_secrets() {
    echo -e "\n${YELLOW}Generating secure secrets...${NC}"
    
    if [ ! -f .env ]; then
        echo -e "${GREEN}Creating .env file...${NC}"
        
        SECRET_KEY=$(openssl rand -hex 32)
        ENCRYPTION_KEY=$(openssl rand -hex 32)
        DB_PASSWORD=$(openssl rand -hex 16)
        REDIS_PASSWORD=$(openssl rand -hex 16)
        
        cat > .env << EOF
# UltraShield WAF Configuration

# Database
POSTGRES_USER=waf
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ultrashield_waf

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# Security
SECRET_KEY=$SECRET_KEY
AI_ENCRYPTION_KEY=$ENCRYPTION_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# WAF Settings
WAF_ENABLED=true
BLOCK_MODE=true
LOG_ALL_REQUESTS=true
MAX_REQUEST_SIZE=10485760

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# DDoS Protection
DDoS_THRESHOLD=1000
DDoS_WINDOW=60

# ML Engine
ML_ENABLED=true
ML_ANOMALY_THRESHOLD=0.75

# App Settings
DEBUG=false
LOG_LEVEL=INFO
EOF
        
        echo -e "${GREEN}✅ .env file created with secure secrets${NC}"
    else
        echo -e "${YELLOW}⚠️  .env already exists, skipping${NC}"
    fi
}

start_containers() {
    echo -e "\n${YELLOW}Building and starting containers...${NC}"
    
    docker-compose up -d --build
    
    echo -e "${GREEN}✅ Containers built and started${NC}"
}

wait_for_services() {
    echo -e "\n${YELLOW}Waiting for services to be healthy...${NC}"
    
    for i in {1..30}; do
        if curl -s http://localhost:8000/health &> /dev/null; then
            echo -e "${GREEN}✅ Backend is healthy${NC}"
            break
        fi
        sleep 2
    done
    
    for i in {1..15}; do
        if curl -s http://localhost:5173 &> /dev/null; then
            echo -e "${GREEN}✅ Frontend is healthy${NC}"
            break
        fi
        sleep 2
    done
}

create_admin() {
    echo -e "\n${YELLOW}Creating admin account...${NC}"
    
    docker-compose exec -T backend python -c "
from backend.models.database import async_session
from backend.models.database import AdminUser
from backend.utils.auth import get_password_hash
import asyncio

async def create_admin():
    from sqlalchemy import select
    async with async_session() as session:
        result = await session.execute(
            select(AdminUser).where(AdminUser.username == 'admin')
        )
        if not result.scalar_one_or_none():
            admin = AdminUser(
                username='admin',
                email='admin@ultrashield.local',
                hashed_password=get_password_hash('admin'),
                full_name='Administrator',
                is_superuser=True
            )
            session.add(admin)
            await session.commit()
            print('Admin user created')

asyncio.run(create_admin())
"
    
    echo -e "${GREEN}✅ Default admin created (admin/admin)${NC}"
}

verify_setup() {
    echo -e "\n${YELLOW}Running health checks...${NC}"
    
    if curl -s http://localhost/health | grep -q "healthy"; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${RED}❌ Health check failed${NC}"
    fi
}

main() {
    check_docker
    check_ports
    generate_secrets
    start_containers
    wait_for_services
    create_admin
    verify_setup
    
    echo -e "\n${GREEN}======================================"
    echo -e "🎉 UltraShield WAF Setup Complete!"
    echo -e "======================================"
    echo ""
    echo -e "${BLUE}Dashboard:${NC}     http://localhost"
    echo -e "${BLUE}API Docs:${NC}     http://localhost/docs"
    echo -e "${BLUE}Flower:${NC}       http://localhost:5555"
    echo ""
    echo -e "${YELLOW}Default credentials: admin / admin${NC}"
    echo -e "${YELLOW}Please change password immediately!${NC}"
    echo ""
}

main "$@"