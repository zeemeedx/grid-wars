# GridWars

**Tema**: Jogo competitivo assíncrono de puzzle tático e criação de arenas. 

**Escopo**: O sistema permite que jogadores construam arenas posicionando armadilhas e obstáculos. Para publicar um desafio, o criador deve obrigatoriamente validar a fase provando que é possível concluí-la. Os oponentes devem traçar rotas para tentar sobreviver e chegar ao fim.

## Funcionalidades Principais 

* **F1**: Editor de Arenas Dinâmicas: Uma interface drag-and-drop onde o jogador cria os mapas. O usuário posiciona paredes, espinhos e rotas de inimigos móveis respeitando um sistema de inventário de itens.

* **F2**: Planejador e Simulador de Rotas: A interface onde o jogador desafiado visualiza o mapa e traça sua rota (sequência de movimentos e esperas).

* **F3**: Sistema de Economia e Inventário: Os usuários acumulam moedas ao passar de mapas desafiadores ou quando oponentes falham em suas próprias criações. Essas moedas são usadas para desbloquear novos tipos de obstáculos.

A funcionalidade implementada no aplicativo mobile será a F2. Uma vez que traçar o caminho do personagem com gestos na tela é a mecânica ideal para smartphones, enquanto o detalhismo de construir o mapa (F1) tira proveito do mouse e da tela maior no navegador.

## Tech Stack 

* **Backend**: Python + FastAPI - Escolhido pela alta performance na validação das rotas e documentação automática.

* **Banco de Dados**: PostgreSQL - Responsável por persistir os perfis de usuários, histórico de tentativas e as matrizes dos mapas.

* **Frontend**: TypeScript + Angular - Framework robusto para a construção do Editor de Arenas.