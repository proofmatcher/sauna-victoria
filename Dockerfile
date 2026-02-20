FROM node:18-alpine

# Install Chromium for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installing Chrome (we use Chromium)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Copy templates to dist folder (TypeScript doesn't copy HTML)
RUN cp -r src/templates dist/templates

EXPOSE 4000
CMD ["node","dist/server.js"]