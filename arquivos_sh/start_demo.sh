#!/bin/bash

# Mover para a raiz do projeto (onde está o docker-compose.yml)
cd "$(dirname "$0")/.."

echo "==========================================="
echo "🎬 Iniciando Demonstração do Consórcio Web3"
echo "==========================================="

echo "🐳 Subindo infraestrutura Docker (Blockchain + Oracle + Drones)..."
docker compose up -d

echo ""
echo "⏳ Aguardando inicialização do nó Ethereum (Hardhat)..."

# Polling no Healthcheck da Blockchain via curl (aguarda responder JSON-RPC)
MAX_RETRIES=30
RETRY_COUNT=0
while ! curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 > /dev/null; do
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ ERRO: Timeout aguardando a Blockchain subir."
        docker compose logs blockchain
        exit 1
    fi
    echo -n "."
done

echo ""
echo "✅ Blockchain online!"

echo "⏳ Aguardando a Companhia Oracle se conectar..."
# Dá um tempo pro Go subir, iniciar contrato e os Drones fazerem registro local.
sleep 5

echo "✅ Companhia Oracle operacional."
echo ""
echo "🚀 Disparando Simulador do Cliente (TypeScript)..."
echo "==================================================="

# Executa o simulador na pasta do cliente CLI
npm run simulate --prefix ./client_cli
