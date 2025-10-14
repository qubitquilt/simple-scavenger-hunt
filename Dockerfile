# Use an official Node.js runtime as a parent image
FROM node:current-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm install
# Copy the rest of the application code to the working directory.
# The .dockerignore file will prevent node_modules and other unnecessary files from being copied.
COPY . .

# Build the Next.js application
RUN npm run build

# Set environment variables
ENV NODE_ENV="production"

# Expose the port that the Next.js app runs on
EXPOSE 3000

# Start the Next.js server
CMD ["npm", "start"]