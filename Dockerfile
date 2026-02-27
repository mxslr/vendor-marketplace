# node.js version

FROM node:24-slim



#openssl for prisma

RUN apt-get update -y && apt-get install -y openssl



#directory root app

WORKDIR /usr/src/app


COPY package*.json ./


COPY prisma ./prisma/


RUN npm install -g npm@11.11.0   

RUN npm i @prisma/client

RUN npx prisma generate


COPY . .



EXPOSE 3000



CMD ["npm", "run", "start:dev"]