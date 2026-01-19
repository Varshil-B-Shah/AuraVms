FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev for build)
RUN npm install && npm cache clean --force

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# Create data directory
RUN mkdir -p /app/data /app/uploads

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]
