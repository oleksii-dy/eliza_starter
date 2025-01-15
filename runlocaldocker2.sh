/usr/bin/bash -c 'docker login -u AWS -p $(aws ecr get-login-password --region us-east-2) 767503528736.dkr.ecr.us-east-2.amazonaws.com'

/usr/bin/docker pull 767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed

#/usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name "agent-docker.service" --entry-point docker-entrypoint-strace.sh 767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed pnpm start:debug --characters=characters/eliza.character.json

#~/cloud-deployment-eliza/runlocaldocker-install-script.sh
# install strace (fixme : update docker)
#/usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name "agent-docker.service" --entrypoint /opt/agent/docker-entrypoint-none.sh 767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed  /opt/agent/runlocaldocker-install-script.sh
#/usr/bin/docker commit "agent-docker.service" "agent-docker-strace"
# second step we debug with strace entrypoint
/usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name "agent-docker.service" --entrypoint /opt/agent/docker-entrypoint-strace2.sh 767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed  pnpm start:debug --characters=characters/eliza.character.json
#100755 >
