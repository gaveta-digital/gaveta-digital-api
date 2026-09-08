FROM node:22-bookworm-slim

WORKDIR /app

# sqlite3 pode precisar compilar o módulo nativo quando não houver binário pronto.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 8080
CMD ["npm", "start"]
