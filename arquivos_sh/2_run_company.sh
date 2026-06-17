#!/bin/bash
set -e

echo -e "\e[1;34m===========================================\e[0m"
echo -e "\e[1;32m⚙️ Inicialização de Companhia de Navegação\e[0m"
echo -e "\e[1;34m===========================================\e[0m"

# Validação do arquivo de chaves
if [ ! -f "chaves_blockchain.txt" ]; then
    echo -e "\e[1;31m❌ Arquivo 'chaves_blockchain.txt' não encontrado!\e[0m"
    echo "Rode o script 1_run_blockchain.sh na Máquina 1 primeiro e traga o pen-drive."
    exit 1
fi

# Defina o IP da Máquina Blockchain aqui, ou deixe vazio para ser perguntado no terminal
IP_BLOCKCHAIN="" # <-- EDITE ESTE VALOR ANTES DE RODAR

if [ -z "$IP_BLOCKCHAIN" ]; then
    read -p "🌐 IP da Máquina Blockchain (ex: 192.168.1.100): " IP_BLOCKCHAIN
else
    echo -e "🌐 IP da Máquina Blockchain predefinido: \e[1;36m$IP_BLOCKCHAIN\e[0m"
fi
read -p "🏢 Nome desta Companhia (ex: Alfa, Beta): " NOME_CIA
read -p "🔑 Qual Conta usar? (Digite um número de 1 a 19): " ACCOUNT_ID

# Extração automática da Private Key do arquivo txt
PRIVATE_KEY=$(grep -A 1 "Account #${ACCOUNT_ID}:" chaves_blockchain.txt | grep "Private Key:" | awk '{print $3}')

# Extração automática de todas as contas para o painel
CONSORTIUM_WALLETS=$(grep -E "Account #[0-9]+: 0x" chaves_blockchain.txt | awk '{print $3}' | paste -sd "," -)

if [ -z "$PRIVATE_KEY" ]; then
    echo -e "\e[1;31m❌ Não foi possível encontrar a Conta #${ACCOUNT_ID} no arquivo.\e[0m"
    exit 1
fi

echo -e "✅ Chave da Conta #${ACCOUNT_ID} importada com sucesso: \e[1;36m${PRIVATE_KEY:0:10}...\e[0m"
echo "📦 Baixando imagens do Docker Hub..."

DOCKER_USER="${DOCKER_USER:-cleidsonramos}"
for img in companhia_oracle painel_web3 drone_patrulha radar_naval sensor_telemetria; do
    docker pull "$DOCKER_USER/$img:latest" >/dev/null 2>&1 || true
done

IP_LOCAL="$(hostname -I | awk '{print $1}')"
PORTA_BASE=48080

echo "🧹 Limpando instâncias antigas nesta máquina..."
docker rm -f oracle_node front_node radar_node sensor_node 2>/dev/null || true
docker ps -a -q --filter "name=drone_node_" | grep -q . && docker rm -f $(docker ps -a -q --filter "name=drone_node_") 2>/dev/null || true

echo "🚀 [1/4] Subindo Motor Oracle..."
docker run -d --restart unless-stopped --name oracle_node \
    -p ${PORTA_BASE}:${PORTA_BASE}/udp -p 48081:48081/tcp -p 48082:48082/tcp -p 48083:48083/tcp \
    -e BLOCKCHAIN_RPC="http://${IP_BLOCKCHAIN}:8545" \
    -e ORACLE_PRIVATE_KEY="$PRIVATE_KEY" \
    "$DOCKER_USER/companhia_oracle:latest" >/dev/null

echo "🌐 [2/4] Subindo Dashboard Web3 (Frontend)..."
docker run -d --restart unless-stopped --name front_node \
    -p 5173:5173 \
    -e VITE_RPC_URL="http://${IP_BLOCKCHAIN}:8545" \
    -e VITE_PRIVATE_KEY="$PRIVATE_KEY" \
    -e VITE_ORACLE_URL="http://${IP_LOCAL}:48083" \
    -e VITE_CONSORTIUM_WALLETS="$CONSORTIUM_WALLETS" \
    -e VITE_COMPANY_NAME="$NOME_CIA" \
    -e VITE_ACCOUNT_ID="$ACCOUNT_ID" \
    "$DOCKER_USER/painel_web3:latest" >/dev/null

echo "📡 [3/4] Subindo Sensores Fixos..."
generate_mac() { printf '02:%02X:%02X:%02X:%02X:%02X' $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)); }
docker run -d --restart unless-stopped --name radar_node -e SERVER_ADDR="${IP_LOCAL}:48081" -e DEVICE_MAC="$(generate_mac)" -e SENSOR_TIPO="RADAR" "$DOCKER_USER/radar_naval:latest" >/dev/null
docker run -d --restart unless-stopped --name sensor_node -e SERVER_ADDR="${IP_LOCAL}:${PORTA_BASE}" -e DEVICE_MAC="$(generate_mac)" "$DOCKER_USER/sensor_telemetria:latest" >/dev/null

echo "🚁 [4/4] Subindo Frota de 5 Drones Patrulha..."
for i in {1..5}; do
    docker run -d --restart unless-stopped --name "drone_node_$i" \
        -e SERVER_ADDR="${IP_LOCAL}:48082" -e DRONE_MAC="$(generate_mac)" \
        "$DOCKER_USER/drone_patrulha:latest" >/dev/null
done

echo "-------------------------------------------"
echo -e "\e[1;32m✅ ECOSSISTEMA DA COMPANHIA '${NOME_CIA}' OPERACIONAL!\e[0m"
echo -e "Acesse o Painel Web3 em: \e[1;36mhttp://localhost:5173\e[0m"
echo "-------------------------------------------"
