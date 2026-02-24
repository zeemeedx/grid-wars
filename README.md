# GridWars

**Tema**: Jogo competitivo assíncrono de puzzle tático e criação de arenas. 

**Descrição**: O GridWars é um jogo multiplayer assíncrono onde a mente tática e a criatividade andam juntas. Inspirado na mecânica de construção comunitária e superação de obstáculos, o jogo divide-se em dois papéis principais: o "Arquiteto" e o "Desafiante". O objetivo é criar os labirintos mais mortais possíveis para frustrar seus oponentes, enquanto você mesmo tenta passar as arenas criadas pela comunidade. É um teste de lógica, precisão e planejamento de rotas.

**Escopo**: O projeto engloba o desenvolvimento de uma plataforma Web API-first e um aplicativo Mobile.
* Construção e Validação (Web): O sistema permite que jogadores construam arenas em matrizes de tamanhos variados, gerenciando um orçamento para posicionar armadilhas estáticas e inimigos móveis. Para publicar um desafio, o criador deve obrigatoriamente validar a fase, provando que é possível concluí-la.
* Gameplay e Execução (Mobile/Web): Os oponentes não controlam o personagem em tempo real; em vez disso, eles devem analisar o mapa e pré-programar uma rota de fuga (incluindo comandos de movimentação e pausas estratégicas). Essa rota é enviada ao backend, que processa a simulação de colisões e retorna o resultado. 
* O sistema contará com rankings globais, perfis de usuários e persistência de dados em um banco relacional, com toda a infraestrutura rodando em containers Docker.

## Funcionalidades Principais 

* **F1**: Editor de Arenas Dinâmicas e Execução de Rotas: Uma interface drag-and-drop onde o jogador cria os mapas. O usuário posiciona paredes, espinhos e rotas de inimigos móveis respeitando um sistema de inventário de itens. Há também outra interface onde o jogador desafiado visualiza o mapa e traça sua rota para a rodada.

* **F2**: Sistema de Economia e Inventário: Os usuários acumulam moedas ao passar de mapas desafiadores ou quando oponentes falham em suas próprias criações. Essas moedas são usadas para desbloquear novos tipos de obstáculos.

* **F3**: Sistema de Pontuação e Ranking: Os usuários também acumulam pontos ao conquistar mapas ou a ter falhas nos mapas criados por eles. Essa pontuação é usada para construir um "Leaderboard" dos melhores jogadores/criadores de mapas.

A funcionalidade implementada no aplicativo mobile será a F1, uma vez que traçar o caminho do personagem com gestos na tela é a mecânica ideal para smartphones.

## Tech Stack 

* **Backend**: Python + FastAPI - Escolhido pela alta performance na validação das rotas e documentação automática.

* **Banco de Dados**: PostgreSQL - Responsável por persistir os perfis de usuários, histórico de tentativas e as matrizes dos mapas.

* **Frontend**: TypeScript + Vue.JS - Framework robusto para a construção de animações suaves para o website.