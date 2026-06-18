#!/bin/bash
set -e

echo -e "\e[1;34m===========================================\e[0m"
echo -e "\e[1;32m⚙️ Inicialização de Companhia de Navegação\e[0m"
echo -e "\e[1;34m===========================================\e[0m"

# Validação do arquivo de chaves
if [ ! -f "chaves_blockchain.txt" ]; then
    echo -e "\e[1;31m❌ Arquivo 'chaves_blockchain.txt' não encontrado!\e[0m"
    echo "Rode o script 1_run_blockchain.sh primeiro."
    exit 1
fi

read -p "🌐 IP da Máquina Blockchain (ex: 192.168.0.25): " IP_BLOCKCHAIN
read -p "🏢 Nome desta Companhia (ex: Alfa, Beta): " NOME_CIA
read -p "🔑 Qual Conta usar? (Digite um número de 1 a 19): " ACCOUNT_ID
read -p "🚪 Porta Base do Oracle (Ex: 48080 para Alfa, 48090 para Beta): " PORTA_BASE
read -p "🚪 Porta do Frontend (Ex: 5173 para Alfa, 5174 para Beta): " PORTA_FRONT

# Fallbacks
PORTA_BASE=${PORTA_BASE:-48080}
PORTA_FRONT=${PORTA_FRONT:-5173}
# Sanitizar nome da cia para evitar problemas no Docker (tudo minúsculo, sem espaços)
NOME_CIA_DOCKER=$(echo "$NOME_CIA" | tr '[:upper:]' '[:lower:]' | tr -d ' ')

# Extração automática da Private Key
PRIVATE_KEY=$(grep -A 1 "Account #${ACCOUNT_ID}:" chaves_blockchain.txt | grep "Private Key:" | awk '{print $3}')

if [ -z "$PRIVATE_KEY" ]; then
    echo -e "\e[1;31m❌ Não foi possível encontrar a Conta #${ACCOUNT_ID}.\e[0m"
    exit 1
fi

echo -e "✅ Chave da Conta #${ACCOUNT_ID} importada: \e[1;36m${PRIVATE_KEY:0:10}...\e[0m"
echo "📦 Verificando imagens do Docker Hub..."

DOCKER_USER="${DOCKER_USER:-cleidsonramos}"
for img in companhia_oracle painel_web3 drone_patrulha radar_naval sensor_telemetria; do
    docker pull "$DOCKER_USER/$img:latest" >/dev/null 2>&1 || true
done

# Cálculo de Portas do Oracle
PORT_UDP=$PORTA_BASE
PORT_TCP1=$((PORTA_BASE + 1))
PORT_TCP2=$((PORTA_BASE + 2))
PORT_API=$((PORTA_BASE + 3))

# IP Local Inteligente (usa hostname -I e pega o primeiro IP real da rede, como o 192.168.0.25)
IP_LOCAL=$(hostname -I | awk '{print $1}')

echo "🧹 Limpando instâncias antigas da companhia ${NOME_CIA}..."
docker rm -f "oracle_${NOME_CIA_DOCKER}" "front_${NOME_CIA_DOCKER}" "radar_${NOME_CIA_DOCKER}" "sensor_${NOME_CIA_DOCKER}" 2>/dev/null || true
docker ps -a -q --filter "name=drone_${NOME_CIA_DOCKER}_" | grep -q . && docker rm -f $(docker ps -a -q --filter "name=drone_${NOME_CIA_DOCKER}_") 2>/dev/null || true

read -p "🚁 Quantidade de Drones Patrulha [Padrão 5]: " QTD_DRONES
QTD_DRONES=${QTD_DRONES:-5}
read -p "📡 Quantidade de Radares Navais [Padrão 1]: " QTD_RADARES
QTD_RADARES=${QTD_RADARES:-1}
read -p "🌡️ Quantidade de Sensores Telemetria [Padrão 1]: " QTD_TELEMETRIA
QTD_TELEMETRIA=${QTD_TELEMETRIA:-1}

echo "🚀 [1/4] Subindo Motor Oracle..."
docker run -d --restart unless-stopped --name "oracle_${NOME_CIA_DOCKER}" \
    -p ${PORT_UDP}:${PORT_UDP}/udp -p ${PORT_TCP1}:${PORT_TCP1}/tcp -p ${PORT_TCP2}:${PORT_TCP2}/tcp -p ${PORT_API}:${PORT_API}/tcp \
    -e BLOCKCHAIN_RPC="ws://${IP_BLOCKCHAIN}:8545" \
    -e ORACLE_PRIVATE_KEY="$PRIVATE_KEY" \
    -e SERVER_PORT="$PORTA_BASE" \
    "$DOCKER_USER/companhia_oracle:latest" >/dev/null

echo "🌐 [2/4] Subindo Dashboard Web3 (Frontend)..."
docker run -d --restart unless-stopped --name "front_${NOME_CIA_DOCKER}" \
    -p ${PORTA_FRONT}:5173 \
    -e VITE_BLOCKCHAIN_RPC="http://${IP_BLOCKCHAIN}:8545" \
    -e VITE_PRIVATE_KEY="$PRIVATE_KEY" \
    -e VITE_ORACLE_URL="http://${IP_LOCAL}:${PORT_API}" \
    -e VITE_COMPANY_NAME="$NOME_CIA" \
    -e VITE_ACCOUNT_SLOT="Conta #${ACCOUNT_ID}" \
    "$DOCKER_USER/painel_web3:latest" >/dev/null

generate_mac() { printf '02:%02X:%02X:%02X:%02X:%02X' $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)); }

echo "📡 [3/4] Subindo Sensores Fixos..."
for i in $(seq 1 "$QTD_RADARES"); do
    docker run -d --restart unless-stopped --name "radar_${NOME_CIA_DOCKER}_$i" -e SERVER_ADDR="${IP_LOCAL}:${PORT_TCP1}" -e DEVICE_MAC="$(generate_mac)" -e SENSOR_TIPO="RADAR" "$DOCKER_USER/radar_naval:latest" >/dev/null
done

for i in $(seq 1 "$QTD_TELEMETRIA"); do
    docker run -d --restart unless-stopped --name "sensor_${NOME_CIA_DOCKER}_$i" -e SERVER_ADDR="${IP_LOCAL}:${PORT_UDP}" -e DEVICE_MAC="$(generate_mac)" "$DOCKER_USER/sensor_telemetria:latest" >/dev/null
done

echo "🚁 [4/4] Subindo Frota de ${QTD_DRONES} Drones..."
for i in $(seq 1 "$QTD_DRONES"); do
    docker run -d --restart unless-stopped --name "drone_${NOME_CIA_DOCKER}_$i" \
        -e SERVER_ADDR="${IP_LOCAL}:${PORT_TCP2}" -e DRONE_MAC="$(generate_mac)" \
        "$DOCKER_USER/drone_patrulha:latest" >/dev/null
done

echo "-------------------------------------------"
echo -e "\e[1;32m✅ ECOSSISTEMA DA COMPANHIA '${NOME_CIA}' OPERACIONAL!\e[0m"
echo -e "📋 Status do Setup:"
echo -e "   - Drones: ${QTD_DRONES} | Radares: ${QTD_RADARES} | Telemetria: ${QTD_TELEMETRIA}"
echo -e "   - Oracle API: \e[1;33mhttp://${IP_LOCAL}:${PORT_API}\e[0m"
echo -e "🌐 Acesse o Painel Web3 em: \e[1;36mhttp://localhost:${PORTA_FRONT}\e[0m"
echo "-------------------------------------------"
