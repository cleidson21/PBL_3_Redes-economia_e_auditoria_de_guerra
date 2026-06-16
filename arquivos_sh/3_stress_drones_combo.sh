#!/bin/bash

echo "==========================================="
echo "🚁 Inicialização da Frota de Drones (IoT)"
echo "==========================================="

read -p "🎯 Digite o IP do Servidor Oracle (ex: 192.168.1.60 ou 127.0.0.1 se for Combo): " IP_ORACLE

if [ -z "$IP_ORACLE" ]; then
    IP_ORACLE="127.0.0.1"
fi

read -p "🚁 Quantos Drones deseja iniciar? (Padrão: 5): " NUM_DRONES

if [ -z "$NUM_DRONES" ]; then
    NUM_DRONES=5
fi

echo "-------------------------------------------"
echo "📦 Baixando/Atualizando imagem do Drone..."
docker pull cleidsonramos/drone:latest

echo "-------------------------------------------"
echo "🚀 Subindo $NUM_DRONES Drones apontando para ${IP_ORACLE}:48082..."

for i in $(seq 1 $NUM_DRONES); do
    # Usa -d para rodar em background, remove container quando parar (--rm)
    docker run -d --rm --name drone_node_$i \
        -e DRONE_ID="DRONE_$i" \
        -e SERVER_ADDR="${IP_ORACLE}:48082" \
        cleidsonramos/drone:latest
    echo "  -> Drone $i iniciado (ID: DRONE_$i)"
done

echo "-------------------------------------------"
echo "✅ Frota de $NUM_DRONES drones conectada ao Oráculo em $IP_ORACLE!"
echo "Use 'docker ps' para ver os containers e 'docker logs -f drone_node_1' para ver os logs."
