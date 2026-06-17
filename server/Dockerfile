FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN npm install --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
