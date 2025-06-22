# AutoN8n Deployment Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Deployments](#cloud-deployments)
- [Monitoring Setup](#monitoring-setup)
- [Security Hardening](#security-hardening)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 20GB minimum (50GB recommended)
- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows with WSL2
- **Node.js**: 18.0.0 or higher
- **Network**: Outbound HTTPS to api.anthropic.com

### Software Dependencies

```bash
# Check Node.js version
node --version  # Should be >= 18.0.0

# Install PM2 for process management
npm install -g pm2

# Install monitoring tools (optional)
npm install -g clinic
npm install -g 0x
```

## Environment Setup

### 1. Create Production Configuration

```bash
# Create production environment file
cp .env.example .env.production

# Edit with your production values
nano .env.production
```

### 2. Production Environment Variables

```env
# Required
ANTHROPIC_API_KEY=sk-ant-api03-xxx
NODE_ENV=production

# Service Configuration
PLUGIN_DATA_DIR=/var/lib/auton8n/plugins
LOG_DIR=/var/log/auton8n
TEMP_DIR=/tmp/auton8n

# Performance Tuning
MAX_CONCURRENT_JOBS=10
JOB_TIMEOUT_MINUTES=30
CLEANUP_INTERVAL_HOURS=1
OLD_JOB_RETENTION_DAYS=7

# Rate Limiting
RATE_LIMIT_JOBS_PER_HOUR=10
RATE_LIMIT_BURST=3

# Claude Configuration
CLAUDE_MODEL=claude-opus-4-20250514
CLAUDE_MAX_TOKENS=8192
CLAUDE_TEMPERATURE=0.7

# Security
ENABLE_SECURITY_SCANNING=true
ALLOWED_PLUGIN_SCOPES=@elizaos,@mycompany
BLOCKED_DEPENDENCIES=eval,child_process

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_PORT=8080

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
ENABLE_LOG_ROTATION=true
LOG_MAX_SIZE=100M
LOG_MAX_FILES=10
```

### 3. Directory Structure

```bash
# Create required directories
sudo mkdir -p /var/lib/auton8n/{plugins,jobs,temp}
sudo mkdir -p /var/log/auton8n
sudo mkdir -p /etc/auton8n

# Set permissions
sudo chown -R $USER:$USER /var/lib/auton8n
sudo chown -R $USER:$USER /var/log/auton8n

# Create systemd service file
sudo nano /etc/systemd/system/auton8n.service
```

## Docker Deployment

### 1. Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src
COPY resources ./resources

# Build TypeScript
RUN npm run build

# Create data directories
RUN mkdir -p /data/plugins /data/jobs /logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose ports
EXPOSE 8080 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start service
CMD ["node", "dist/index.js"]
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  auton8n:
    build: .
    container_name: auton8n
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PLUGIN_DATA_DIR=/data/plugins
      - LOG_DIR=/logs
    volumes:
      - ./data:/data
      - ./logs:/logs
      - ./.env.production:/app/.env:ro
    ports:
      - "8080:8080"  # Health check
      - "9090:9090"  # Metrics
    networks:
      - elizaos
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Optional: Prometheus for metrics
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9091:9090"
    networks:
      - elizaos

  # Optional: Grafana for visualization
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3000:3000"
    networks:
      - elizaos

networks:
  elizaos:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
```

### 3. Build and Run

```bash
# Build Docker image
docker build -t auton8n:latest .

# Run with docker-compose
docker-compose up -d

# Check logs
docker-compose logs -f auton8n

# Scale horizontally
docker-compose up -d --scale auton8n=3
```

## Kubernetes Deployment

### 1. Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: elizaos

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: auton8n-config
  namespace: elizaos
data:
  NODE_ENV: "production"
  PLUGIN_DATA_DIR: "/data/plugins"
  LOG_DIR: "/logs"
  MAX_CONCURRENT_JOBS: "10"
  RATE_LIMIT_JOBS_PER_HOUR: "10"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: auton8n-secret
  namespace: elizaos
type: Opaque
stringData:
  ANTHROPIC_API_KEY: "sk-ant-api03-xxx"

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auton8n
  namespace: elizaos
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auton8n
  template:
    metadata:
      labels:
        app: auton8n
    spec:
      containers:
      - name: auton8n
        image: auton8n:latest
        ports:
        - containerPort: 8080
          name: health
        - containerPort: 9090
          name: metrics
        envFrom:
        - configMapRef:
            name: auton8n-config
        - secretRef:
            name: auton8n-secret
        volumeMounts:
        - name: data
          mountPath: /data
        - name: logs
          mountPath: /logs
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: auton8n-data
      - name: logs
        emptyDir: {}

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: auton8n
  namespace: elizaos
spec:
  selector:
    app: auton8n
  ports:
  - name: health
    port: 8080
    targetPort: 8080
  - name: metrics
    port: 9090
    targetPort: 9090
  type: ClusterIP

---
# k8s/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: auton8n-data
  namespace: elizaos
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: standard

---
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auton8n-hpa
  namespace: elizaos
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auton8n
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 2. Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n elizaos

# View logs
kubectl logs -f deployment/auton8n -n elizaos

# Scale deployment
kubectl scale deployment/auton8n --replicas=5 -n elizaos
```

## Cloud Deployments

### AWS ECS

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI
docker build -t auton8n .
docker tag auton8n:latest $ECR_URI/auton8n:latest
docker push $ECR_URI/auton8n:latest

# Deploy with ECS CLI
ecs-cli compose up --cluster-config my-cluster
```

### Google Cloud Run

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/$PROJECT_ID/auton8n

# Deploy to Cloud Run
gcloud run deploy auton8n \
  --image gcr.io/$PROJECT_ID/auton8n \
  --platform managed \
  --region us-central1 \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="ANTHROPIC_API_KEY=anthropic-key:latest"
```

### Azure Container Instances

```bash
# Push to ACR
az acr build --registry $ACR_NAME --image auton8n .

# Deploy container
az container create \
  --resource-group myResourceGroup \
  --name auton8n \
  --image $ACR_NAME.azurecr.io/auton8n:latest \
  --cpu 2 \
  --memory 4 \
  --environment-variables NODE_ENV=production
```

## Monitoring Setup

### 1. Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'auton8n'
    static_configs:
      - targets: ['auton8n:9090']
    metrics_path: '/metrics'
```

### 2. Grafana Dashboard

```json
{
  "dashboard": {
    "title": "AutoN8n Monitoring",
    "panels": [
      {
        "title": "Active Jobs",
        "targets": [
          {
            "expr": "auton8n_active_jobs"
          }
        ]
      },
      {
        "title": "Success Rate",
        "targets": [
          {
            "expr": "rate(auton8n_successful_jobs[5m]) / rate(auton8n_total_jobs[5m])"
          }
        ]
      },
      {
        "title": "API Error Rate",
        "targets": [
          {
            "expr": "rate(auton8n_api_errors[5m])"
          }
        ]
      }
    ]
  }
}
```

### 3. Alerts

```yaml
# alerts.yml
groups:
  - name: auton8n
    rules:
      - alert: HighErrorRate
        expr: rate(auton8n_api_errors[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High API error rate detected"
          
      - alert: JobQueueBacklog
        expr: auton8n_pending_jobs > 50
        for: 10m
        annotations:
          summary: "Large job queue backlog"
          
      - alert: ServiceDown
        expr: up{job="auton8n"} == 0
        for: 1m
        annotations:
          summary: "AutoN8n service is down"
```

## Security Hardening

### 1. Network Security

```bash
# Firewall rules
sudo ufw allow 8080/tcp  # Health check
sudo ufw allow 9090/tcp  # Metrics (internal only)
sudo ufw enable
```

### 2. API Key Management

```bash
# Use secrets management
# AWS Secrets Manager
aws secretsmanager create-secret --name anthropic-api-key --secret-string $ANTHROPIC_API_KEY

# Kubernetes Secrets
kubectl create secret generic anthropic-key --from-literal=api-key=$ANTHROPIC_API_KEY

# HashiCorp Vault
vault kv put secret/auton8n anthropic_api_key=$ANTHROPIC_API_KEY
```

### 3. Security Scanning

```bash
# Scan Docker image
docker scan auton8n:latest

# Dependency scanning
npm audit
npm audit fix

# Code scanning
npm run security-scan
```

## Backup & Recovery

### 1. Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/auton8n/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup data
tar -czf $BACKUP_DIR/plugins.tar.gz /var/lib/auton8n/plugins
tar -czf $BACKUP_DIR/jobs.tar.gz /var/lib/auton8n/jobs

# Backup configuration
cp /etc/auton8n/* $BACKUP_DIR/

# Upload to S3
aws s3 sync $BACKUP_DIR s3://my-backup-bucket/auton8n/

# Clean old backups
find /backups/auton8n -mtime +30 -delete
```

### 2. Recovery Procedure

```bash
#!/bin/bash
# restore.sh

RESTORE_DATE=$1
BACKUP_DIR="/backups/auton8n/$RESTORE_DATE"

# Stop service
systemctl stop auton8n

# Restore data
tar -xzf $BACKUP_DIR/plugins.tar.gz -C /
tar -xzf $BACKUP_DIR/jobs.tar.gz -C /

# Restore configuration
cp $BACKUP_DIR/*.conf /etc/auton8n/

# Start service
systemctl start auton8n
```

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check logs
journalctl -u auton8n -f

# Verify configuration
node -e "console.log(require('./dist/config').validate())"

# Check permissions
ls -la /var/lib/auton8n
```

#### High Memory Usage

```bash
# Check memory usage
ps aux | grep node

# Enable heap profiling
NODE_OPTIONS="--max-old-space-size=4096" node dist/index.js

# Generate heap snapshot
kill -USR2 $(pgrep -f "node.*auton8n")
```

#### API Rate Limiting

```bash
# Check rate limit status
curl http://localhost:8080/api/rate-limit

# Reset rate limits (emergency)
redis-cli DEL "rate-limit:*"
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=elizaos:plugin-auton8n:* node dist/index.js

# Enable verbose logging
LOG_LEVEL=debug node dist/index.js
```

### Performance Tuning

```bash
# Node.js optimization flags
NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size" node dist/index.js

# PM2 cluster mode
pm2 start dist/index.js -i max --name auton8n

# Monitor performance
clinic doctor -- node dist/index.js
```

## Maintenance

### Regular Tasks

1. **Daily**
   - Check error logs
   - Monitor API usage
   - Verify backup completion

2. **Weekly**
   - Review metrics
   - Clean old job data
   - Update dependencies

3. **Monthly**
   - Security patches
   - Performance review
   - Capacity planning

### Update Procedure

```bash
# 1. Backup current version
./backup.sh

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm ci

# 4. Build
npm run build

# 5. Run tests
npm test

# 6. Deploy with zero downtime
pm2 reload auton8n
``` 