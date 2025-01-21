how i tested on aws
`root@ip-10-0-4-156:/opt/agent# history`
```

    1  docker ps
    2  docker images
    3  cat /var/log/agent_systemd.log 
    4  docker ps
    5  cd /opt/agent/
    6  ls
    7  git pull
    8  git branch
    9  bash ./rundocker.sh 
   10  docker ps
   11  cat systemd/agent-docker.service 
   12  /usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name  767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed
   13  /usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name "test"  767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed
   14  docker images
   15  docker pull
   16  cd /opt/agent/
   17  git pull
   18  bash ./rundocker.sh 
   19  docker ps
   20  /usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name "test"  767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed
   21  cd /opt/agent/
   22  git pull
   23  git pull --force
   24  git branch
   25  git checkout origin/feature/arm64_fastembed
   26  ls
   27  docker ps
   28  docker pull 767503528736.dkr.ecr.us-east-2.amazonaws.com/nodemodules/tokenizer:latest
   29  docker run -it 767503528736.dkr.ecr.us-east-2.amazonaws.com/nodemodules/tokenizer:latest bash
   30  /usr/bin/docker pull  767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed
   31  /usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name "test"  767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed
   32  docker ps
   33  cd /opt/agent/
   34  git pull
   35  git fetch --all
   36  git remote show
   37  git remote show origin
   38  /usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name "agent-docker.service" 767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed apt install strace && strace -f -o strace.txt pnpm start:debug --characters=characters/eliza.character.json
   39  bash ./runlocaldocker.sh 
   40  bash ./runlocaldockerstrace.sh
   41  /usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name "agent-docker.service" 767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed --help #strace -f -o strace.txt pnpm start:debug --characters=characters/eliza.character.json
   42  /usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name "agent-docker.service" 767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed bash
   43  ls
   44  strace
   45  which pnpm
   46  pnpm
   47  exit
   48  /usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name "agent-docker.service" 767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed --version
   49  /usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name "agent-docker.service" 767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed --help
   50  ls
   51  find -name pnpm
   52  /usr/bin/docker run -p 3000:3000 --mount type=bind,source=/opt/agent,target=/opt/agent --env-file /var/run/agent/secrets/env  --rm --name "agent-docker.service" 767503528736.dkr.ecr.us-east-2.amazonaws.com/agent/eliza:feature-arm64_fastembed bash 
   53  which node
   54  ls
   55  cd /app
   56  cd /
   57  cd app
   58  lls
   59  ls -latr
   60  exit
   61  docker ps
   62  docker image
   63  docker image ls
   64  docker history    d3d9aabbea4e  
   65  docker run    d3d9aabbea4e  
   66  # history
   67  history
```
