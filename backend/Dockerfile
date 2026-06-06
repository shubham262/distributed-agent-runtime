# 1. Base Image (Matched to local development environment)
FROM node:22-alpine

# 2. Working Directory
WORKDIR /app

# 3. Cache Dependencies
COPY package*.json ./
RUN npm install

# 4. Copy Source Code
COPY . .

# 5. Expose Port
EXPOSE 3001

# 6. Start Command
CMD ["npm", "run", "dev"]