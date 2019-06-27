FROM node:10

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --only=production

COPY . .

ENV PORT 8080

EXPOSE 8080

CMD [ "npm", "start" ]
