FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files first
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start the application
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
