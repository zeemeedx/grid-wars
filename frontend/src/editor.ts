import { createApp, ref, onMounted, onUnmounted } from 'vue'
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8052';

createApp({
    setup() {
        const grade = ref<number[]>(Array(100).fill(0))
        const itemSelecionado = ref<number | null>(null)
        const borrachaSelecionada = ref(false)
        const planejarTrajeto = ref(false)
        const mostrarPlay = ref(false)
        const isDrawing = ref(false)
        const isPlaying = ref(false)
        const playerPos = ref(0)
        const rotaPlanejada = ref<number[]>([0])
        const mostrarVitoria = ref(false)
        const isReadOnly = ref(false)
        const currentMapPoints = ref(20)
        const isCompleted = ref(false)

        const enemyDirection = ref<'h' | 'v'>('h')
        const toggleEnemyDirection = () => {
            enemyDirection.value = enemyDirection.value === 'h' ? 'v' : 'h'
        }

        const portalColor = ref(5)
        const togglePortalColor = () => {
            if (portalColor.value === 5) portalColor.value = 7
            else if (portalColor.value === 7) portalColor.value = 8
            else portalColor.value = 5
            
            if ([5, 7, 8].includes(itemSelecionado.value as number)) {
                itemSelecionado.value = portalColor.value
            }
        }
        const getPortalEmoji = () => {
            if (portalColor.value === 5) return '🌀'
            if (portalColor.value === 7) return '🟠'
            if (portalColor.value === 8) return '🟢'
            return '🌀'
        }

        const moedas = ref(0)
        const pontos = ref(0)
        const itensBloqueados = ref<Record<number, boolean>>({
            1: false,
            2: false,
            3: true,
            5: true,
            6: true
        })
        const precos: Record<number, number> = {
            3: 25,
            5: 50,
            6: 100
        }
        
        const gridBackup = ref<number[]>([])

        const togglePlanejador = () => {
            planejarTrajeto.value = !planejarTrajeto.value
            if (planejarTrajeto.value) {
                gridBackup.value = [...grade.value]
                itemSelecionado.value = null
                borrachaSelecionada.value = false
                playerPos.value = 0
                rotaPlanejada.value = [0]
                mostrarPlay.value = false
            } else {
                if (gridBackup.value.length > 0) grade.value = [...gridBackup.value]
            }
        }
    
        const moverJogador = (event: KeyboardEvent) => {
            if (!planejarTrajeto.value || mostrarPlay.value) return

            const tecla = event.key.toLowerCase()
            let dir = 0

            if (tecla == 'w') dir = -10
            else if (tecla == 's') dir = 10
            else if (tecla == 'a') dir = -1
            else if (tecla == 'd') dir = 1

            if (dir === 0) return

            const canMove = (pos: number, d: number) => {
                if (d === -10 && pos < 10) return false
                if (d === 10 && pos >= 90) return false
                if (d === -1 && pos % 10 === 0) return false
                if (d === 1 && pos % 10 === 9) return false
                const nextTile = grade.value[pos + d]
                if (nextTile === 1) return false
                return true
            }

            if (canMove(playerPos.value, dir)) {
                let currPos = playerPos.value
                let nextPos = currPos + dir
                let sliding = false

                do {
                    // Portal Logic (IDs 5, 7, 8)
                    const tileType = grade.value[nextPos]
                    if ([5, 7, 8].includes(tileType)) {
                        const otherPortal = grade.value.findIndex((v, i) => v === tileType && i !== nextPos)
                        if (otherPortal !== -1) {
                            nextPos = otherPortal
                        }
                    }

                    const prevPos = currPos
                    currPos = nextPos
                    playerPos.value = currPos
                    rotaPlanejada.value.push(currPos)

                    // Fragile Floor Logic (ID 6)
                    if (grade.value[prevPos] === 6) {
                        grade.value[prevPos] = 1 // Turns into a wall
                    }

                    // Ice sliding logic (ID 2)
                    if (grade.value[currPos] === 2 && canMove(currPos, dir)) {
                        nextPos = currPos + dir
                        sliding = true
                    } else {
                        sliding = false
                    }
                } while (sliding)

                if (grade.value[playerPos.value] === -2) {
                    mostrarPlay.value = true
                }
            }
        }

        const executarPlay = () => {
            mostrarPlay.value = false
            planejarTrajeto.value = false
            playerPos.value = rotaPlanejada.value[0]
            isPlaying.value = true

            // Use backup to have the clean map state
            const baseGrid = gridBackup.value.length > 0 ? [...gridBackup.value] : [...grade.value]
            grade.value = [...baseGrid]
            
            const staticGrid = [...baseGrid]
            const inimigosAtivos = [] as {pos: number, dir: number, type: number}[]
            
            baseGrid.forEach((tipo, index) => {
                if (tipo === 3 || tipo === 4) {
                    inimigosAtivos.push({
                        pos: index,
                        dir: 1,
                        type: tipo
                    })
                    staticGrid[index] = 0
                }
            })

            let passo = 1
            const velocidade = 300

            const intervalo = setInterval(async () => {
                if (passo < rotaPlanejada.value.length) {
                    const prevPos = playerPos.value
                    playerPos.value = rotaPlanejada.value[passo]

                    // Visual logic for Fragile Floor breaking
                    if (grade.value[prevPos] === 6) {
                        grade.value[prevPos] = 1
                        staticGrid[prevPos] = 1 // Now a wall for enemy collisions too
                    }

                    inimigosAtivos.forEach(enemy => {
                        const isHorizontal = enemy.type === 3
                        const step = isHorizontal ? 1 : 10
                        
                        const checkCollision = (pos: number, d: number) => {
                            if (isHorizontal) {
                                if (d === 1 && pos % 10 === 9) return true
                                if (d === -1 && pos % 10 === 0) return true
                            } else {
                                if (d === 1 && pos >= 90) return true
                                if (d === -1 && pos < 10) return true
                            }
                            return staticGrid[pos + (step * d)] === 1
                        }

                        if (checkCollision(enemy.pos, enemy.dir)) {
                            enemy.dir *= -1
                        }
                        
                        if (!checkCollision(enemy.pos, enemy.dir)) {
                            enemy.pos += (step * enemy.dir)
                        }
                    })

                    const novaGrade = [...staticGrid] // Use staticGrid as base (clean of enemies)
                    inimigosAtivos.forEach(e => {
                        novaGrade[e.pos] = e.type
                    })
                    novaGrade[99] = -2
                    grade.value = novaGrade

                    if (inimigosAtivos.some(e => e.pos === playerPos.value)) {
                        clearInterval(intervalo)
                        isPlaying.value = false
                        if (gridBackup.value.length > 0) grade.value = [...gridBackup.value]
                        alert("Você foi atingido por um inimigo!")
                        continuarEditando()
                        return
                    }

                    passo++
                } else {
                    clearInterval(intervalo)
                    isPlaying.value = false

                    if (grade.value[playerPos.value] === -2 || staticGrid[playerPos.value] === -2) {
                        mostrarVitoria.value = true
                        if (isReadOnly.value && !isCompleted.value) {
                            const token = localStorage.getItem('token')
                            const mapId = new URLSearchParams(window.location.search).get('map_id')

                            try {
                                const response = await fetch(`${BASE_URL}/maps/${mapId}/complete`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                })
                                if (response.ok) {
                                    const data = await response.json()
                                    if (data.points_earned) {
                                        pontos.value += data.points_earned
                                        moedas.value += data.coins_earned
                                        alert(`Parabéns! Você ganhou ${data.points_earned} pontos e ${data.coins_earned} moedas!`)
                                    }
                                    isCompleted.value = true
                                }
                            } catch (e) {
                                console.error("Erro ao completar mapa:", e)
                            }
                        }
                    }
                    if (gridBackup.value.length > 0) grade.value = [...gridBackup.value]
                }
            }, velocidade)
        }

        const continuarEditando = () => {
            mostrarVitoria.value = false
            planejarTrajeto.value = false
            playerPos.value = 0
            rotaPlanejada.value = [0]
            if (gridBackup.value.length > 0) grade.value = [...gridBackup.value]
        }

        const salvarMapa = async () => {
            if (isReadOnly.value) return;

            const token = localStorage.getItem('token')
            if (!token) {
                alert("Você precisa estar logado para salvar um mapa.")
                window.location.href = 'auth.html'
                return
            }

            const pts = prompt("Defina a pontuação do seu mapa (20 a 200 pontos):", "20")
            if (pts === null) return;
            const ptsInt = parseInt(pts)
            if (isNaN(ptsInt) || ptsInt < 20 || ptsInt > 200) {
                alert("Pontuação inválida! Deve ser entre 20 e 200.")
                return
            }

            try {
                const response = await fetch(`${BASE_URL}/maps/`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ grid: grade.value, points: ptsInt })
                })
                if (response.ok) {
                    alert("Mapa salvo com sucesso!")
                    continuarEditando()
                } else {
                    alert("Erro ao salvar mapa.")
                }
            } catch (error) {
                console.error("Erro ao salvar: ", error)
            }
        }

        const voltar = () => {
            window.location.href = 'index.html'
        }

        onMounted(async () => {
            const token = localStorage.getItem('token')
            if (!token) {
                window.location.href = 'auth.html'
                return
            }

            const urlParams = new URLSearchParams(window.location.search)
            const mapId = urlParams.get('map_id')
            const mode = urlParams.get('mode')
            isReadOnly.value = mode === 'play'

            try {
                const userRes = await fetch(`${BASE_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (userRes.ok) {
                    const userData = await userRes.json()
                    moedas.value = userData.coins
                    pontos.value = userData.points
                    
                    if (userData.unlocked_items) {
                        userData.unlocked_items.forEach((id: number) => {
                            itensBloqueados.value[id] = false
                        })
                    }
                } else {
                    localStorage.removeItem('token')
                    window.location.href = 'auth.html'
                }
            } catch (e) {
                console.error("Erro ao carregar usuário", e)
            }

            window.addEventListener('keydown', moverJogador)
            
            if (mapId) {
                try {
                    const response = await fetch(`${BASE_URL}/maps/${mapId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    if (response.ok) {
                        const mapData = await response.json()
                        if (mapData.grid) {
                            grade.value = mapData.grid
                            grade.value[99] = -2
                        }
                        currentMapPoints.value = mapData.points
                        isCompleted.value = mapData.completed
                    }
                } catch (error) {
                    console.error("Erro ao carregar mapa: ", error)
                }
            }
        })
        onUnmounted(() => window.removeEventListener('keydown', moverJogador))

        grade.value[99] = -2

        const selecionarItem = async (id: number) => {
            if (itensBloqueados.value[id]) {
                const token = localStorage.getItem('token')
                try {
                    const response = await fetch(`${BASE_URL}/users/me/buy_item/${id}`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    if (response.ok) {
                        const data = await response.json()
                        moedas.value = data.coins
                        itensBloqueados.value[id] = false
                        alert("Item desbloqueado com sucesso!")
                    } else {
                        const errorData = await response.json()
                        alert(errorData.detail || "Erro ao comprar item.")
                    }
                } catch (e) {
                    console.error("Erro na compra:", e)
                    alert("Erro de conexão ao tentar comprar o item.")
                }
                return
            }
            if (id === 5) itemSelecionado.value = portalColor.value
            else itemSelecionado.value = id
            
            borrachaSelecionada.value = false
        }

        const toggleBorracha = () => {
            borrachaSelecionada.value = !borrachaSelecionada.value
            if (borrachaSelecionada.value) itemSelecionado.value = null
        }

        const pintar = (index: number) => {
            if (isReadOnly.value || !isDrawing.value) return
            if (index === 0 || index === 99) return

            if (itemSelecionado.value !== null) {
                if (itemSelecionado.value === 3) {
                    grade.value[index] = enemyDirection.value === 'h' ? 3 : 4
                } else if ([5, 7, 8].includes(itemSelecionado.value)) {
                    const count = grade.value.filter(v => v === itemSelecionado.value).length
                    if (count >= 2 && grade.value[index] !== itemSelecionado.value) {
                        alert("Você só pode colocar até 2 portais dessa cor.")
                        isDrawing.value = false
                        return
                    }
                    grade.value[index] = itemSelecionado.value
                } else {
                    grade.value[index] = itemSelecionado.value
                }
            } else if (borrachaSelecionada.value) {
                grade.value[index] = 0
            }

            grade.value[99] = -2
        }

        const iniciarDesenho = (index: number) => {
            isDrawing.value = true
            pintar(index)
        }

        const pararDesenho = () => {
            isDrawing.value = false
        }

        return {
            moedas,
            pontos,
            itensBloqueados,
            precos,
            grade,
            itemSelecionado,
            borrachaSelecionada,
            isDrawing,
            isPlaying,
            playerPos,
            planejarTrajeto,
            mostrarPlay,
            mostrarVitoria,
            rotaPlanejada,
            isReadOnly,
            enemyDirection,
            toggleEnemyDirection,
            portalColor,
            togglePortalColor,
            getPortalEmoji,
            selecionarItem,
            toggleBorracha,
            pintar,
            iniciarDesenho,
            pararDesenho,
            moverJogador,
            togglePlanejador,
            executarPlay,
            continuarEditando,
            salvarMapa,
            voltar
        }
    }
}).mount('#app')