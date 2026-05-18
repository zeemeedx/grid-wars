-- 1. Criação das Tabelas (Garante que elas existam antes do backend tentar inserir algo)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    coins INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS maps (
    id SERIAL PRIMARY KEY,
    grid JSON NOT NULL,
    points INTEGER DEFAULT 20,
    owner_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS completed_maps (
    user_id INTEGER REFERENCES users(id),
    map_id INTEGER REFERENCES maps(id),
    PRIMARY KEY (user_id, map_id)
);

-- 2. Carga de Dados Iniciais (Exigência do Professor)
-- Nota: O password inserido abaixo é um placeholder para evitar erros. 
-- Para logar de verdade depois, use a rota de registro do seu frontend.
INSERT INTO users (id, username, hashed_password, coins, points) 
VALUES (1, 'admin_grupo06', '$2b$12$FakeHashParaCargaInicialNaoLogavelXYZ123', 100, 500)
ON CONFLICT (username) DO NOTHING;

-- Inserindo o mapa clássico do seu prototype.py
INSERT INTO maps (grid, points, owner_id) 
VALUES (
    '[["P", ".", ".", "#", ".", ".", ".", ".", ".", "."], [".", "#", ".", "#", ".", ".", "T", ".", "#", "."], [".", "#", ".", ".", ".", "#", "#", ".", "#", "."], [".", ".", ".", "#", ".", ".", ".", ".", ".", "."], ["#", "#", ".", "#", "#", "#", "#", "#", ".", "#"], [".", ".", ".", ".", ".", ".", ".", ".", ".", "."], [".", "#", "#", "#", "#", "#", "#", "#", "#", "."], [".", ".", ".", ".", ".", "T", ".", ".", ".", "."], ["#", "#", "#", "#", ".", "#", "#", "#", "#", "."], [".", ".", ".", ".", ".", ".", ".", ".", ".", "G"]]', 
    50, 
    1
)
ON CONFLICT DO NOTHING;

-- Ajusta a sequência de IDs do PostgreSQL para não dar erro quando a API criar novos itens
SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id), 0) + 1, false) FROM users;