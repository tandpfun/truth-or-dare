FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy source code
COPY . .

# Generate Prisma client first, then build TypeScript
ENV PRISMA_CLIENT_ENGINE_TYPE=binary
RUN npx prisma generate --schema=./src/prisma/schema.prisma
RUN yarn tsc

# Start the application
CMD ["node", "build/index.js"]
