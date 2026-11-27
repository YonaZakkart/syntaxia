FROM node:22-alpine

RUN npm install -g tsx@4.23.15

WORKDIR /tmp
