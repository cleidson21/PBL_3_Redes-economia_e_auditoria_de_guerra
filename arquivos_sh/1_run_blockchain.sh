#!/bin/bash
set -e

DOCKER_USER="${DOCKER_USER:-cleidsonramos}"
IMG_BLOCKCHAIN="${IMG_BLOCKCHAIN:-$DOCKER_USER/ormuz_blockchain:latest}"

echo -e "\e[1;34m===========================================\e[0m"
echo -e "\e[1;32m🌍 Inicialização do Cartório Web3 (Máquina 1)\e[0m"
echo -e "\e[1;34m===========================================\e[0m"

docker pull "$IMG_BLOCKCHAIN" >/dev/null 2>&1 || true
docker rm -f ormuz_blockchain_node 2>/dev/null || true

echo "🚀 Subindo nó Blockchain (Hardhat) na porta 8545..."
docker run -d --name ormuz_blockchain_node -p 8545:8545 "$IMG_BLOCKCHAIN"

echo "⏳ Aguardando a Blockchain iniciar (5s)..."
sleep 5

echo "📜 Forçando o Deploy do Smart Contract (Wallet #0)..."
docker exec ormuz_blockchain_node npx hardhat ignition deploy ignition/modules/OrmuzConsortium.ts --network localhost >/dev/null 2>&1 || echo "⚠️ Aviso: Deploy falhou ou já foi feito pelo entrypoint."

echo "💾 Extraindo Contas e Chaves Privadas..."
# Pega os logs, filtra apenas as linhas de Account e Private Key, e salva no arquivo txt
docker logs ormuz_blockchain_node | grep -E "Account #[0-9]+:|Private Key:" > chaves_blockchain.txt

echo -e "\e[1;32m✅ Blockchain Operacional! Deploy Concluído.\e[0m"
echo "-------------------------------------------"
echo -e "\e[1;33mO arquivo 'chaves_blockchain.txt' foi gerado nesta pasta.\e[0m"
echo -e "\e[1;36m-> Leve este pen-drive para as outras máquinas para subir as Companhias!\e[0m"
echo "-------------------------------------------"
