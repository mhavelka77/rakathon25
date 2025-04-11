# Build stage
FROM node:16-alpine AS build

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install --quiet

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage - using lightweight nginx to serve static files
FROM nginx:alpine

# Copy built files from build stage to nginx serve directory
COPY --from=build /app/build /usr/share/nginx/html

# Add custom nginx configuration if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 