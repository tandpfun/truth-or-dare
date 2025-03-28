FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy source code
COPY . .

# Build TypeScript and generate Prisma client
RUN yarn tsc
RUN yarn prisma generate

# Start the application
CMD ["node", "build/index.js"]
