#!/bin/sh
set -eu

mkdir -p server-data
docker compose up -d --build --force-recreate
