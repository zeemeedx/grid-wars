#!/bin/bash

echo "========================================"
echo "🚀 Iniciando Deploy - Grid Wars Grupo 06"
echo "========================================"

# Derruba os containers antigos e limpa resquícios se houver
echo "[1/3] Parando serviços anteriores..."
docker compose down

# Reconstrói as imagens com o código atualizado e sobe em segundo plano
echo "[2/3] Construindo imagens e subindo containers..."
docker compose up --build -d

# Exibe o status final dos containers
echo "[3/3] Status dos containers do Grupo 06:"
docker compose ps

echo "========================================"
echo "✅ Deploy concluído com sucesso!"
echo "🌐 Frontend Web disponível na porta: 8051"
echo "⚙️ API Backend disponível na porta:  8052"
echo "========================================"