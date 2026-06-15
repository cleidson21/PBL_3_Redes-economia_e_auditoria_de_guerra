#!/bin/bash

# Abortar imediatamente em caso de erro
set -e

# O usuário deve passar o nome de usuário do Docker Hub como argumento ou variável de ambiente
DOCKER_USER=${1:-"<dockerhub-usuario>"}

if [ "$DOCKER_USER" == "<dockerhub-usuario>" ]; then
    echo "⚠️ AVISO: Usando o placeholder '<dockerhub-usuario>'."
    echo "Dica: Você pode passar o seu username como argumento: ./build_and_push.sh meu_usuario"
fi

echo "==========================================="
echo "🚀 Iniciando rotina de CI/Docker Push"
echo "==========================================="

echo "🔐 Validando autenticação no Docker Hub..."
if ! docker info | grep -q "Username"; then
    echo "❌ Erro: Você não está autenticado no Docker Hub."
    echo "Por favor, execute 'docker login' primeiro."
    exit 1
fi
echo "✅ Autenticação validada."

echo ""
echo "🏗️  Construindo a imagem da Companhia Oracle (Go)..."
docker build -t ${DOCKER_USER}/companhia_oracle:latest ./servidor

echo "📤 Fazendo push da imagem Companhia Oracle..."
docker push ${DOCKER_USER}/companhia_oracle:latest

echo ""
echo "🏗️  Construindo a imagem do Drone Patrulha..."
docker build -t ${DOCKER_USER}/drone_patrulha:latest ./drone

echo "📤 Fazendo push da imagem Drone Patrulha..."
docker push ${DOCKER_USER}/drone_patrulha:latest

echo ""
echo "✅ Todos os builds e pushes foram concluídos com sucesso para o usuário '${DOCKER_USER}'!"
