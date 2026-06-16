#!/bin/bash
set -e

cd "$(dirname "$0")/../blockchain"

echo -e "\e[1;34m===========================================\e[0m"
echo -e "\e[1;32m🌍 Inicialização da Blockchain Hardhat\e[0m"
echo -e "\e[1;34m===========================================\e[0m"

# Verificar dependencias
if ! command -v node &> /dev/null; then
    echo -e "\e[1;31m❌ Node.js não encontrado!\e[0m"
    exit 1
fi
if ! command -v npx &> /dev/null; then
    echo -e "\e[1;31m❌ npx não encontrado!\e[0m"
    exit 1
fi

echo "📦 Iniciando Hardhat Node..."
npx hardhat node --hostname 0.0.0.0 &
HARDHAT_PID=$!

sleep 4

echo ""
echo -e "\e[1;33mCopie uma das Private Keys acima para iniciar Companhias Oracle.\e[0m"
echo ""

read -p "Deseja iniciar também o Frontend Web? (s/N) " RESP
if [[ "$RESP" =~ ^[Ss]$ ]]; then
    echo "🌐 Iniciando Frontend Vite..."
    cd ../frontend-web
    npm run dev -- --host 0.0.0.0
else
    echo "⏳ Pressione Ctrl+C para encerrar a Blockchain."
    wait $HARDHAT_PID
fi
