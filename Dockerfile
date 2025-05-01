# Use an official Node.js runtime as the base image (Node 22)
FROM node:22-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Copy the .env file only if it exists
RUN if [ -f .env ]; then cp .env .; fi

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD [ "npm", "run", "start" ]
