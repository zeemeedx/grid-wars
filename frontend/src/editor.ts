import { createApp, ref, onMounted, onUnmounted } from 'vue'

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

        const moedas = ref(0)
        const pontos = ref(0)
        const itensBloqueados = ref<Record<number, boolean>>({
            1: false,
            2: false,
            3: true
        })
        const precos: Record<number, number> = {
            3: 50
        }

        const togglePlanejador = () => {
            planejarTrajeto.value = !planejarTrajeto.value
            if (planejarTrajeto.value) {
                itemSelecionado.value = null
                borrachaSelecionada.value = false
                playerPos.value = 0
                rotaPlanejada.value = [0]
                mostrarPlay.value = false
            }
        }
    
        const moverJogador = (event: KeyboardEvent) => {
            if (!planejarTrajeto.value || mostrarPlay.value) return

            const tecla = event.key.toLowerCase()
            let novaPos = playerPos.value

            if (tecla == 'w' && playerPos.value >= 10) novaPos -= 10
            else if (tecla == 's' && playerPos.value <= 89) novaPos += 10
            else if (tecla == 'a' && playerPos.value % 10 !== 0) novaPos -= 1
            else if (tecla == 'd' && playerPos.value % 10 !== 9) novaPos += 1

            if (grade.value[novaPos] === 1) return
            
            if (novaPos !== playerPos.value) {
                playerPos.value = novaPos
                rotaPlanejada.value.push(novaPos)

                if (grade.value[novaPos] === -2) {
                    mostrarPlay.value = true
                }
            }
        }

        const executarPlay = () => {
            mostrarPlay.value = false
            planejarTrajeto.value = false
            playerPos.value = rotaPlanejada.value[0]
            isPlaying.value = true

            let passo = 1
            const velocidade = 300

            const intervalo = setInterval(async () => {
                if (passo < rotaPlanejada.value.length) {
                    playerPos.value = rotaPlanejada.value[passo]
                    passo++
                } else {
                    clearInterval(intervalo)
                    isPlaying.value = false

                    if (grade.value[playerPos.value] === -2) {
                        mostrarVitoria.value = true
                        if (isReadOnly.value && !isCompleted.value) {
                            const token = localStorage.getItem('token')
                            const mapId = new URLSearchParams(window.location.search).get('map_id')

                            try {
                                const response = await fetch(`http://localhost:8000/maps/${mapId}/complete`, {
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
                }
            }, velocidade)
        }

        const continuarEditando = () => {
            mostrarVitoria.value = false
            planejarTrajeto.value = false
            playerPos.value = 0
            rotaPlanejada.value = [0]
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
                const response = await fetch("http://localhost:8000/maps/", {
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
                const userRes = await fetch('http://localhost:8000/users/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (userRes.ok) {
                    const userData = await userRes.json()
                    moedas.value = userData.coins
                    pontos.value = userData.points
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
                    const response = await fetch(`http://localhost:8000/maps/${mapId}`, {
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

        const selecionarItem = (id: number) => {
            if (itensBloqueados.value[id]) {
                if (moedas.value >= precos[id]) {
                    moedas.value -= precos[id]
                    itensBloqueados.value[id] = false
                } else {
                    alert(`Moedas insuficientes! Custa ${precos[id]} moedas.`)
                }
                return
            }
            itemSelecionado.value = id
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
                grade.value[index] = itemSelecionado.value
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