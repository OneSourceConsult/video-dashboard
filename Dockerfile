FROM node:20.19-alpine

# Install system dependencies
RUN apk add --no-cache python3 alpine-sdk

# Set working directory
WORKDIR /var/www/html/

# Copy only package.json and package-lock.json for efficient caching
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the app (no TLS needed at this stage)
RUN npm run build

# Set the command to serve the app at runtime
CMD ["npx", "vite", "preview", "--host", "--port=8080"]
