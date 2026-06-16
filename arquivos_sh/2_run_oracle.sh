#!/bin/bash
set -e

cd "$(dirname "$0")/../servidor"

echo -e "\e[1;34m===========================================\e[0m"
echo -e "\e[1;32m⚙️ Inicialização da Companhia Oracle\e[0m"
echo -e "\e[1;34m===========================================\e[0m"

read -p "IP da Blockchain: " IP_BLOCKCHAIN
read -p "Private Key da Companhia: " PRIVATE_KEY
read -p "Porta Base do Servidor [48080]: " PORTA_BASE

if [ -z "$PORTA_BASE" ]; then
    PORTA_BASE="48080"
fi

if [ -z "$IP_BLOCKCHAIN" ] || [ -z "$PRIVATE_KEY" ]; then
    echo -e "\e[1;31m❌ IP da Blockchain e Private Key são obrigatórios.\e[0m"
    exit 1
fi

export BLOCKCHAIN_RPC="http://${IP_BLOCKCHAIN}:8545"
export ORACLE_PRIVATE_KEY="$PRIVATE_KEY"
export SERVER_PORT="$PORTA_BASE"

echo "-------------------------------------------"
echo -e "\e[1;32mOracle iniciado.\e[0m"
echo -e "RPC: \e[1;36m$BLOCKCHAIN_RPC\e[0m"
echo "-------------------------------------------"

go run .
