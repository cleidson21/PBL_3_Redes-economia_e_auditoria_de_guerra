#!/bin/bash
set -e

echo -e "\e[1;34m===========================================\e[0m"
echo -e "\e[1;32m➕ Adição de Dispositivos (Em Execução)\e[0m"
echo -e "\e[1;34m===========================================\e[0m"

read -p "🏢 Nome da Companhia Alvo (ex: Alfa, Beta): " NOME_CIA
NOME_CIA_DOCKER=$(echo "$NOME_CIA" | tr '[:upper:]' '[:lower:]' | tr -d ' ')

read -p "🚪 Porta Base do Oracle da Companhia (ex: 48080): " PORTA_BASE
PORTA_BASE=${PORTA_BASE:-48080}

PORT_UDP=$PORTA_BASE
PORT_TCP1=$((PORTA_BASE + 1))
PORT_TCP2=$((PORTA_BASE + 2))

IP_LOCAL="$(hostname -I | awk '{print $1}')"

read -p "🚁 Quantidade de Drones Patrulha extras para adicionar (padrão: 1): " QTD_DRONES
QTD_DRONES=${QTD_DRONES:-1}
read -p "📡 Quantidade de Radares Navais extras para adicionar (padrão: 0): " QTD_RADARES
QTD_RADARES=${QTD_RADARES:-0}
read -p "🌡️ Quantidade de Sensores de Telemetria extras para adicionar (padrão: 0): " QTD_TELEMETRIA
QTD_TELEMETRIA=${QTD_TELEMETRIA:-0}

DOCKER_USER="${DOCKER_USER:-cleidsonramos}"

generate_mac() { printf '02:%02X:%02X:%02X:%02X:%02X' $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)); }

# Achar os IDs atuais para não sobrescrever contêineres existentes
DRONE_LAST_ID=$(docker ps -a --filter "name=drone_${NOME_CIA_DOCKER}_" --format "{{.Names}}" | awk -F'_' '{print $3}' | sort -n | tail -1)
DRONE_LAST_ID=${DRONE_LAST_ID:-0}

RADAR_LAST_ID=$(docker ps -a --filter "name=radar_${NOME_CIA_DOCKER}_" --format "{{.Names}}" | awk -F'_' '{print $3}' | sort -n | tail -1)
RADAR_LAST_ID=${RADAR_LAST_ID:-0}

SENSOR_LAST_ID=$(docker ps -a --filter "name=sensor_${NOME_CIA_DOCKER}_" --format "{{.Names}}" | awk -F'_' '{print $3}' | sort -n | tail -1)
SENSOR_LAST_ID=${SENSOR_LAST_ID:-0}

echo "Subindo novos contêineres..."

if [ "$QTD_RADARES" -gt 0 ]; then
    for i in $(seq 1 $QTD_RADARES); do
        NEW_ID=$((RADAR_LAST_ID + i))
        echo "Lançando radar_${NOME_CIA_DOCKER}_${NEW_ID}..."
        docker run -d --restart unless-stopped --name "radar_${NOME_CIA_DOCKER}_${NEW_ID}" -e SERVER_ADDR="${IP_LOCAL}:${PORT_TCP1}" -e DEVICE_MAC="$(generate_mac)" -e SENSOR_TIPO="RADAR" "$DOCKER_USER/radar_naval:latest" >/dev/null
    done
fi

if [ "$QTD_TELEMETRIA" -gt 0 ]; then
    for i in $(seq 1 $QTD_TELEMETRIA); do
        NEW_ID=$((SENSOR_LAST_ID + i))
        echo "Lançando sensor_${NOME_CIA_DOCKER}_${NEW_ID}..."
        docker run -d --restart unless-stopped --name "sensor_${NOME_CIA_DOCKER}_${NEW_ID}" -e SERVER_ADDR="${IP_LOCAL}:${PORT_UDP}" -e DEVICE_MAC="$(generate_mac)" "$DOCKER_USER/sensor_telemetria:latest" >/dev/null
    done
fi

if [ "$QTD_DRONES" -gt 0 ]; then
    for i in $(seq 1 $QTD_DRONES); do
        NEW_ID=$((DRONE_LAST_ID + i))
        echo "Lançando drone_${NOME_CIA_DOCKER}_${NEW_ID}..."
        docker run -d --restart unless-stopped --name "drone_${NOME_CIA_DOCKER}_${NEW_ID}" \
            -e SERVER_ADDR="${IP_LOCAL}:${PORT_TCP2}" -e DRONE_MAC="$(generate_mac)" \
            "$DOCKER_USER/drone_patrulha:latest" >/dev/null
    done
fi

echo -e "\e[1;32m✅ Dispositivos adicionados com sucesso ao sistema da Companhia ${NOME_CIA}!\e[0m"
