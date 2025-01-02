# Use a standard Node image (matches your version 22)
FROM node:22-slim

# 1. Define the secret as a build argument
ARG SSH_PRIVATE_KEY

WORKDIR /app

# 2. Install Git and OpenSSH (required for cloning)
RUN apt-get update && apt-get install -y git openssh-client

# 3. Setup SSH, Clone Dependencies, and Build
# We do this in one RUN command to keep the secret out of intermediate layers
COPY package.json package-lock.json ./

RUN mkdir -p ~/.ssh && \
    # Decode the Base64 key to a file
    echo "$SSH_PRIVATE_KEY" | base64 -d > ~/.ssh/id_rsa && \
    cat ~/.ssh/id_rsa && \
    chmod 600 ~/.ssh/id_rsa && \
    # Add GitHub to known hosts
    ssh-keyscan github.com >> ~/.ssh/known_hosts && \
    # Install dependencies
    npm install

# 4. Copy the rest of your app source
COPY . .

# 5. Run your build script (which required the private repo)
# Note: If this script does a FRESH git clone, you might need to keep the key until here.
# If "npm install" handled the clone, you are good.
RUN npm run zendo:build

RUN rm -f ~/.ssh/id_rsa

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
