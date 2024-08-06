FROM node:22-slim
LABEL authors="jaxkdev"

# Create app directory and set permissions
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

# Set the working directory
WORKDIR /home/node/app

# Copy application code
COPY . .

# Use a non-root user
USER node

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "server/index.js"]