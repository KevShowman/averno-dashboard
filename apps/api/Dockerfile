FROM node:18-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Expose port
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "pnpm prisma db push && pnpm db:seed && pnpm run dev"]
