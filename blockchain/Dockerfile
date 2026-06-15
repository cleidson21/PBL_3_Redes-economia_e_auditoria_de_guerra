FROM node:22.13.0-alpine

WORKDIR /app

# Instala dependências nativas necessárias para algumas bibliotecas criptográficas
RUN apk add --no-cache python3 make g++ git

# Copia configurações
COPY package*.json ./
COPY hardhat.config.ts ./
COPY tsconfig.json ./

# Instala todas as dependências
RUN npm install

# Copia o resto do código
COPY . .

# Expõe a porta RPC e WebSocket do Hardhat
EXPOSE 8545

# Inicia o nó local que fará o binding na interface 0.0.0.0
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
