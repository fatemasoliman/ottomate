FROM node:20-alpine

# Install dependencies
RUN apk update && \
    apk add --no-cache chromium

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000 3002

CMD ["node", "server.js"]
