FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
