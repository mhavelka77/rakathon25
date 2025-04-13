#!/bin/bash

docker buildx build -t backend:latest ./backend --platform linux/amd64 -o type=docker,dest=./tools/bin/backend.tar
docker buildx build -t frontend:latest ./frontend --platform linux/amd64 -o type=docker,dest=./tools/bin/frontend.tar

cd tools
go mod init myapp
go mod tidy
cd bin
GOOS=windows GOARCH=amd64 go build -o onkominer.exe ../ 

