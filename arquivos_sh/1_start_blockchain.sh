#!/bin/bash

# Vai para a raiz do projeto
cd "$(dirname "$0")/.."

echo "==========================================="
echo "🌍 Inicialização da Blockchain e Frontend"
echo "==========================================="

# Tenta detectar o IP Local (Adaptativo para Linux e Git Bash no Windows)
if command -v hostname > /dev/null 2>&1 && hostname -I > /dev/null 2>&1; then
    IP_LOCAL=$(hostname -I | awk '{print $1}')
else
    # Fallback para Windows Git Bash
    IP_LOCAL=$(ipconfig | grep -i "IPv4" | head -n 1 | awk '{print $NF}' | tr -d '\r')
fi

# Fallback final se falhar
if [ -z "$IP_LOCAL" ]; then
    IP_LOCAL="127.0.0.1"
fi

echo "🚀 Iniciando EVM e Painel Web no IP: $IP_LOCAL"
echo "💡 Informe este IP (ws://$IP_LOCAL:8545) para as Companhias Oracle!"
echo "-------------------------------------------"

# Iniciar o Hardhat em background
echo "📦 Iniciando Hardhat Node..."
npx hardhat node --hostname 0.0.0.0 &
HARDHAT_PID=$!

# Aguarda um tempinho pro node subir
sleep 5

# Iniciar o painel React
echo "🌐 Iniciando Frontend Vite..."
npm run dev --prefix frontend-web -- --host 0.0.0.0

# Caso o frontend seja finalizado (Ctrl+C), mata o hardhat
kill $HARDHAT_PID
