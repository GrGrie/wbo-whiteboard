#!/bin/sh
set -eu

mkdir -p server-data
docker build -t techbrain-wbo .
docker rm -f techbrain-wbo 2>/dev/null || true    # Windows PowerShell: docker rm -f techbrain-wbo 2>$null
docker run -d \
  --name techbrain-wbo \
  --restart unless-stopped \
  -p 5002:80 \
  -e SAVE_BOARDS=true \
  -e WBO_HISTORY_DIR=/opt/app/server-data \
  -v "$(pwd)/server-data:/opt/app/server-data" \
  techbrain-wbo

# Windows Powershell launch command:
# docker run -d --name techbrain-wbo --restart unless-stopped -p 5002:80 -e SAVE_BOARDS=true -e WBO_HISTORY_DIR=/opt/app/server-data -v "${PWD}/server-data:/opt/app/server-data" techbrain-wbo