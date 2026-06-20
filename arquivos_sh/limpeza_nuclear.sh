#!/bin/bash

echo ""
echo "===================================================="
echo "           NÚCLEO DE AUTODESTRUIÇÃO ATIVADO"
echo "===================================================="
echo ""

# Para o usuário Cleidson: 
# Este script mata TODOS os containers (de todas as companhias),
# remove todas as imagens e limpa toda a memória do Docker.
# Use com responsabilidade!

# 1. Matar todos os containers rodando (de qualquer usuário)
docker stop $(docker ps -aq) 2>/dev/null || true

# 2. Deletar todos os containers (vazios ou rodando)
docker rm $(docker ps -aq) 2>/dev/null || true

# 3. Deletar todas as imagens salvas na máquina
docker rmi $(docker images -q) 2>/dev/null || true

# 4. Limpeza pesada do sistema (remove lixo, redes não usadas, etc)
docker system prune -a --volumes -f

echo ""
echo "===================================================="
echo "            LIMPEZA CONCLUÍDA"
echo "===================================================="
echo ""
echo "Memória 100% livre. Máquina pronta para do zero."
