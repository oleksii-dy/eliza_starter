import {
  type IAgentRuntime,
  elizaLogger,
} from '@elizaos/core';
import {
  type TrainingConfig,
  type CloudInstance,
} from '../types.js';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Handles cloud deployment for training jobs
 */
export class CloudDeployment {
  private activeInstances: Map<string, CloudInstance> = new Map();
  private scriptsDir: string;

  constructor(private runtime: IAgentRuntime) {
    this.scriptsDir = path.join(process.cwd(), 'packages/plugin-training/cloud-scripts');
  }

  async initialize(): Promise<void> {
    elizaLogger.info('Initializing Cloud Deployment');

    // Create scripts directory
    await fs.mkdir(this.scriptsDir, { recursive: true });

    // Generate deployment scripts
    await this.generateDeploymentScripts();

    elizaLogger.info('Cloud Deployment initialized');
  }

  private async generateDeploymentScripts(): Promise<void> {
    await Promise.all([
      this.generateGCPScript(),
      this.generateAWSScript(),
      this.generateAzureScript(),
      this.generateDockerfile(),
      this.generateStartupScript(),
    ]);
  }

  private async generateGCPScript(): Promise<void> {
    const script = `#!/bin/bash
# Google Cloud Platform Deployment Script for ElizaOS Training

set -e

# Configuration
PROJECT_ID="$1"
ZONE="$2"
INSTANCE_NAME="$3"
MACHINE_TYPE="$4"
GPU_TYPE="$5"
IMAGE_FAMILY="pytorch-latest-gpu"
IMAGE_PROJECT="deeplearning-platform-release"

if [ "$#" -ne 5 ]; then
    echo "Usage: $0 <project-id> <zone> <instance-name> <machine-type> <gpu-type>"
    echo "Example: $0 my-project us-central1-a eliza-training n1-standard-8 nvidia-tesla-v100"
    exit 1
fi

echo "Creating GCP instance for ElizaOS training..."

# Create instance with GPU
gcloud compute instances create "$INSTANCE_NAME" \\
    --project="$PROJECT_ID" \\
    --zone="$ZONE" \\
    --machine-type="$MACHINE_TYPE" \\
    --network-interface=network-tier=PREMIUM,subnet=default \\
    --maintenance-policy=TERMINATE \\
    --provisioning-model=STANDARD \\
    --scopes=https://www.googleapis.com/auth/cloud-platform \\
    --accelerator=type="$GPU_TYPE",count=1 \\
    --image-family="$IMAGE_FAMILY" \\
    --image-project="$IMAGE_PROJECT" \\
    --boot-disk-size=100GB \\
    --boot-disk-type=pd-ssd \\
    --metadata-from-file startup-script=startup.sh \\
    --tags=eliza-training

echo "Instance $INSTANCE_NAME created successfully"

# Get external IP
EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" \\
    --project="$PROJECT_ID" \\
    --zone="$ZONE" \\
    --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

echo "Instance IP: $EXTERNAL_IP"

# Create firewall rule for training ports
gcloud compute firewall-rules create eliza-training-ports \\
    --project="$PROJECT_ID" \\
    --allow tcp:8000,tcp:8765,tcp:6006 \\
    --source-ranges 0.0.0.0/0 \\
    --target-tags eliza-training \\
    2>/dev/null || echo "Firewall rule already exists"

echo "Deployment completed. SSH command:"
echo "gcloud compute ssh $INSTANCE_NAME --project=$PROJECT_ID --zone=$ZONE"
`;

    await fs.writeFile(path.join(this.scriptsDir, 'deploy-gcp.sh'), script);
    await fs.chmod(path.join(this.scriptsDir, 'deploy-gcp.sh'), '755');
  }

  private async generateAWSScript(): Promise<void> {
    const script = `#!/bin/bash
# AWS Deployment Script for ElizaOS Training

set -e

# Configuration
INSTANCE_TYPE="$1"
KEY_NAME="$2"
SECURITY_GROUP="$3"
SUBNET_ID="$4"
AMI_ID="$5"

if [ "$#" -ne 5 ]; then
    echo "Usage: $0 <instance-type> <key-name> <security-group> <subnet-id> <ami-id>"
    echo "Example: $0 p3.2xlarge my-key sg-12345678 subnet-12345678 ami-12345678"
    exit 1
fi

echo "Creating AWS instance for ElizaOS training..."

# Launch EC2 instance
INSTANCE_ID=$(aws ec2 run-instances \\
    --image-id "$AMI_ID" \\
    --instance-type "$INSTANCE_TYPE" \\
    --key-name "$KEY_NAME" \\
    --security-group-ids "$SECURITY_GROUP" \\
    --subnet-id "$SUBNET_ID" \\
    --user-data file://startup.sh \\
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=eliza-training},{Key=Project,Value=ElizaOS}]' \\
    --query 'Instances[0].InstanceId' \\
    --output text)

echo "Instance created: $INSTANCE_ID"

# Wait for instance to be running
echo "Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \\
    --instance-ids "$INSTANCE_ID" \\
    --query 'Reservations[0].Instances[0].PublicIpAddress' \\
    --output text)

echo "Instance IP: $PUBLIC_IP"
echo "SSH command: ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP"
`;

    await fs.writeFile(path.join(this.scriptsDir, 'deploy-aws.sh'), script);
    await fs.chmod(path.join(this.scriptsDir, 'deploy-aws.sh'), '755');
  }

  private async generateAzureScript(): Promise<void> {
    const script = `#!/bin/bash
# Azure Deployment Script for ElizaOS Training

set -e

# Configuration
RESOURCE_GROUP="$1"
VM_NAME="$2"
VM_SIZE="$3"
LOCATION="$4"

if [ "$#" -ne 4 ]; then
    echo "Usage: $0 <resource-group> <vm-name> <vm-size> <location>"
    echo "Example: $0 eliza-rg eliza-training Standard_NC6s_v3 eastus"
    exit 1
fi

echo "Creating Azure VM for ElizaOS training..."

# Create resource group if it doesn't exist
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

# Create VM
az vm create \\
    --resource-group "$RESOURCE_GROUP" \\
    --name "$VM_NAME" \\
    --image "Canonical:0001-com-ubuntu-server-focal:20_04-lts-gen2:latest" \\
    --size "$VM_SIZE" \\
    --admin-username azureuser \\
    --generate-ssh-keys \\
    --custom-data startup.sh \\
    --public-ip-sku Standard \\
    --tags Project=ElizaOS Purpose=Training

# Open ports for training
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --port 8000,8765,6006

# Get public IP
PUBLIC_IP=$(az vm show --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" \\
    --show-details --query publicIps --output tsv)

echo "VM created successfully"
echo "Public IP: $PUBLIC_IP"
echo "SSH command: ssh azureuser@$PUBLIC_IP"
`;

    await fs.writeFile(path.join(this.scriptsDir, 'deploy-azure.sh'), script);
    await fs.chmod(path.join(this.scriptsDir, 'deploy-azure.sh'), '755');
  }

  private async generateDockerfile(): Promise<void> {
    const dockerfile = `# ElizaOS Training Environment Dockerfile
FROM nvidia/cuda:12.1-devel-ubuntu22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    python3 \\
    python3-pip \\
    nodejs \\
    npm \\
    git \\
    curl \\
    wget \\
    vim \\
    htop \\
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip3 install --upgrade pip
RUN pip3 install \\
    torch \\
    transformers \\
    datasets \\
    accelerate \\
    wandb \\
    tensorboard \\
    atroposlib \\
    websockets \\
    asyncio \\
    numpy \\
    pandas

# Install Node.js dependencies globally
RUN npm install -g bun

# Create working directory
WORKDIR /app

# Copy ElizaOS training package
COPY . /app/

# Install Node.js dependencies
RUN bun install

# Build TypeScript
RUN bun run build

# Expose ports
EXPOSE 8000 8765 6006

# Create startup script
RUN echo '#!/bin/bash\\n\\
echo "Starting ElizaOS Training Environment..."\\n\\
# Start Atropos API server\\n\\
python3 /app/atropos/bridge_server.py &\\n\\
\\n\\
# Start TensorBoard\\n\\
tensorboard --logdir=/app/training-logs --host=0.0.0.0 --port=6006 &\\n\\
\\n\\
# Start training service\\n\\
node /app/dist/index.js\\n\\
' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
`;

    await fs.writeFile(path.join(this.scriptsDir, 'Dockerfile'), dockerfile);
  }

  private async generateStartupScript(): Promise<void> {
    const script = `#!/bin/bash
# ElizaOS Training Instance Startup Script

set -e

echo "Starting ElizaOS Training instance setup..."

# Update system
apt-get update
apt-get upgrade -y

# Install required packages
apt-get install -y \\
    python3 \\
    python3-pip \\
    nodejs \\
    npm \\
    git \\
    curl \\
    wget \\
    vim \\
    htop \\
    nvidia-driver-470 \\
    nvidia-cuda-toolkit

# Install Python packages
pip3 install --upgrade pip
pip3 install \\
    torch \\
    transformers \\
    datasets \\
    accelerate \\
    wandb \\
    tensorboard \\
    atroposlib \\
    websockets \\
    asyncio \\
    numpy \\
    pandas

# Install Node.js and Bun
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

# Clone ElizaOS repository (assuming it's public or you'll need to handle auth)
cd /home/ubuntu
git clone https://github.com/elizaos/eliza.git
cd eliza/packages/plugin-training

# Install dependencies and build
bun install
bun run build

# Create directories
mkdir -p /home/ubuntu/training-data
mkdir -p /home/ubuntu/training-logs
mkdir -p /home/ubuntu/models

# Set up environment variables
cat > /home/ubuntu/.env << EOF
ATROPOS_API_URL=http://localhost:8000
HUGGING_FACE_TOKEN=\${HUGGING_FACE_TOKEN}
WANDB_API_KEY=\${WANDB_API_KEY}
POSTGRES_URL=\${POSTGRES_URL}
OPENAI_API_KEY=\${OPENAI_API_KEY}
ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY}
EOF

# Create systemd service for training
cat > /etc/systemd/system/eliza-training.service << EOF
[Unit]
Description=ElizaOS Training Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/eliza/packages/plugin-training
Environment=NODE_ENV=production
EnvironmentFile=/home/ubuntu/.env
ExecStart=/home/ubuntu/.bun/bin/bun run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable eliza-training
systemctl start eliza-training

# Create TensorBoard service
cat > /etc/systemd/system/tensorboard.service << EOF
[Unit]
Description=TensorBoard Service
After=network.target

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/local/bin/tensorboard --logdir=/home/ubuntu/training-logs --host=0.0.0.0 --port=6006
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl enable tensorboard
systemctl start tensorboard

echo "ElizaOS Training instance setup completed!"
echo "Services:"
echo "- Training API: http://$(curl -s ifconfig.me):8000"
echo "- TensorBoard: http://$(curl -s ifconfig.me):6006"
echo "- Bridge WebSocket: ws://$(curl -s ifconfig.me):8765"
`;

    await fs.writeFile(path.join(this.scriptsDir, 'startup.sh'), script);
    await fs.chmod(path.join(this.scriptsDir, 'startup.sh'), '755');
  }

  /**
   * Deploy training to cloud
   */
  async deployTraining(config: TrainingConfig): Promise<CloudInstance> {
    if (!config.deploymentConfig) {
      throw new Error('Deployment configuration not provided');
    }

    elizaLogger.info(`Deploying training to ${config.deploymentConfig.provider}`);

    const instanceId = `eliza-training-${Date.now()}`;
    
    const instance: CloudInstance = {
      id: instanceId,
      provider: config.deploymentConfig.provider,
      region: config.deploymentConfig.region,
      instanceType: config.deploymentConfig.instanceType,
      status: 'pending',
      tags: {
        Project: 'ElizaOS',
        Purpose: 'Training',
        Environment: 'production',
      },
      createdAt: new Date(),
    };

    this.activeInstances.set(instanceId, instance);

    try {
      switch (config.deploymentConfig.provider) {
        case 'gcp':
          await this.deployToGCP(instance, config);
          break;
        case 'aws':
          await this.deployToAWS(instance, config);
          break;
        case 'azure':
          await this.deployToAzure(instance, config);
          break;
        default:
          throw new Error(`Unsupported cloud provider: ${config.deploymentConfig.provider}`);
      }

      instance.status = 'running';
      elizaLogger.info(`Training deployed successfully: ${instanceId}`);
      
      return instance;
    } catch (error) {
      instance.status = 'terminated';
      elizaLogger.error(`Error deploying training: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async deployToGCP(instance: CloudInstance, config: TrainingConfig): Promise<void> {
    const projectId = this.runtime.getSetting('GCP_PROJECT_ID') as string;
    if (!projectId) {
      throw new Error('GCP_PROJECT_ID not configured');
    }

    const args = [
      projectId,
      config.deploymentConfig!.region,
      instance.id,
      config.deploymentConfig!.instanceType,
      config.deploymentConfig!.gpuType || 'nvidia-tesla-v100',
    ];

    await this.runDeploymentScript('deploy-gcp.sh', args);
  }

  private async deployToAWS(instance: CloudInstance, config: TrainingConfig): Promise<void> {
    const keyName = this.runtime.getSetting('AWS_KEY_NAME') as string;
    const securityGroup = this.runtime.getSetting('AWS_SECURITY_GROUP') as string;
    const subnetId = this.runtime.getSetting('AWS_SUBNET_ID') as string;
    const amiId = this.runtime.getSetting('AWS_AMI_ID') as string;

    if (!keyName || !securityGroup || !subnetId || !amiId) {
      throw new Error('Missing AWS configuration: AWS_KEY_NAME, AWS_SECURITY_GROUP, AWS_SUBNET_ID, AWS_AMI_ID');
    }

    const args = [
      config.deploymentConfig!.instanceType,
      keyName,
      securityGroup,
      subnetId,
      amiId,
    ];

    await this.runDeploymentScript('deploy-aws.sh', args);
  }

  private async deployToAzure(instance: CloudInstance, config: TrainingConfig): Promise<void> {
    const resourceGroup = this.runtime.getSetting('AZURE_RESOURCE_GROUP') as string || 'eliza-training-rg';

    const args = [
      resourceGroup,
      instance.id,
      config.deploymentConfig!.instanceType,
      config.deploymentConfig!.region,
    ];

    await this.runDeploymentScript('deploy-azure.sh', args);
  }

  private async runDeploymentScript(scriptName: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.scriptsDir, scriptName);
      const childProcess = spawn(scriptPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data: any) => {
        const output = data.toString();
        stdout += output;
        elizaLogger.info(`Deployment: ${output.trim()}`);
      });

      childProcess.stderr.on('data', (data: any) => {
        const output = data.toString();
        stderr += output;
        elizaLogger.error(`Deployment Error: ${output.trim()}`);
      });

      childProcess.on('close', (code: any) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Deployment script failed with code ${code}: ${stderr}`));
        }
      });

      childProcess.on('error', (error: any) => {
        reject(new Error(`Failed to run deployment script: ${error.message}`));
      });
    });
  }

  /**
   * Get instance status
   */
  async getInstanceStatus(instanceId: string): Promise<CloudInstance | null> {
    return this.activeInstances.get(instanceId) || null;
  }

  /**
   * Stop instance
   */
  async stopInstance(instanceId: string): Promise<void> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    elizaLogger.info(`Stopping instance: ${instanceId}`);

    // Implementation depends on cloud provider
    // For now, just mark as stopped
    instance.status = 'stopped';

    elizaLogger.info(`Instance ${instanceId} stopped`);
  }

  /**
   * List all active instances
   */
  async listInstances(): Promise<CloudInstance[]> {
    return Array.from(this.activeInstances.values());
  }

  async cleanup(): Promise<void> {
    elizaLogger.info('Cleaning up Cloud Deployment');

    // Stop all active instances
    for (const instance of this.activeInstances.values()) {
      try {
        if (instance.status === 'running') {
          await this.stopInstance(instance.id);
        }
      } catch (error) {
        elizaLogger.error(`Error stopping instance ${instance.id}:`, error);
      }
    }

    this.activeInstances.clear();
    elizaLogger.info('Cloud Deployment cleaned up');
  }
}