# Use a smaller base image
FROM node:18-alpine

# Install necessary dependencies for Puppeteer
RUN apk add --no-cache chromium

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy only necessary files
COPY server.js .
COPY screenshots ./screenshots

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000 3002

CMD ["node", "server.js"]
