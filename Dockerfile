FROM node:20.13.0-alpine

WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm install netlify-cli -g
RUN npm install

COPY . .

CMD [ "npm", "start" ]