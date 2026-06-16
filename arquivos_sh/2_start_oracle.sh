#!/bin/bash

# Vai para a raiz do projeto e entra na pasta do servidor
cd "$(dirname "$0")/../servidor"

echo "==========================================="
echo "⚙️ Inicialização do Servidor Oracle (Go)"
echo "==========================================="

# Detecta IP Local
if command -v hostname > /dev/null 2>&1 && hostname -I > /dev/null 2>&1; then
    IP_LOCAL=$(hostname -I | awk '{print $1}')
else
    IP_LOCAL=$(ipconfig | grep -i "IPv4" | head -n 1 | awk '{print $NF}' | tr -d '\r')
fi

if [ -z "$IP_LOCAL" ]; then
    IP_LOCAL="127.0.0.1"
fi

# Configurar IP da Blockchain
if [ -z "$IP_BLOCKCHAIN" ]; then
    read -p "🌐 Digite o IP da Blockchain (ex: 192.168.1.50): " IP_BLOCKCHAIN
fi

# Fallback se usuário der enter vazio
if [ -z "$IP_BLOCKCHAIN" ]; then
    IP_BLOCKCHAIN="127.0.0.1"
fi

export BLOCKCHAIN_RPC="ws://${IP_BLOCKCHAIN}:8545"

echo "-------------------------------------------"
echo "✅ Companhia Oracle iniciada! IP local para os Drones: ${IP_LOCAL}:48082"
echo "-------------------------------------------"

# Iniciar o servidor Go
go run .
