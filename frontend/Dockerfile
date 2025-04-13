# Single stage build for simplicity
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --quiet

# Copy source code
COPY . .

# Build the application with production optimization
RUN npm run build

# Install a simple static file server
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the server (using serve instead of nginx)
CMD ["serve", "-s", "build", "-l", "3000"] 