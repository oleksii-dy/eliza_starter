# build
docker build -t adam-local -f Dockerfile.adam .
# run
docker run -it \
  -v $(pwd)/characters:/app/characters \
  -p 3000:3000 \
  -v /var/run/tappd.sock:/var/run/tappd.sock \
  --env-file .env \
  adam-local
# docker ps
# docker logs
docker logs -f <container_id>
# docker stop
docker stop <container_id>