FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Set environment variables
ENV REACT_APP_API_URL=http://localhost:8000

EXPOSE 3000

# Use a script to set the API URL correctly in Docker
CMD ["npm", "start"] 