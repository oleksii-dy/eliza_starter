#
/usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name "agent-docker.service" 767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:latest pnpm start:debug --characters=characters/eliza.character.json
