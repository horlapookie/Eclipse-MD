FROM node:20-bullseye-slim

# Set working directory
WORKDIR /app

# Install system dependencies for native modules (fixes GLib-GObject error)
RUN apt-get update && apt-get install -y \
    git \
    libvips-dev \
    libvips42 \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpng-dev \
    pkg-config \
    build-essential \
    python3 \
    g++ \
    make \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
# First install production dependencies
RUN npm install --production --legacy-peer-deps

# Rebuild native modules to ensure they work in the container
RUN npm rebuild || true

# Clean npm cache
RUN npm cache clean --force

# Copy application files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV VIPS_WARNING=0

# Expose port (optional, for web interfaces)
EXPOSE 5000

# Start the bot
CMD ["npm", "start"]
