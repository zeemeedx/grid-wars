import { createApp, ref, onMounted } from 'vue'
declare var process: any;
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface User {
    username: string;
    points: number;
    coins: number;
}

interface Player {
    id: number;
    username: string;
    points?: number;
    map_count?: number;
}

createApp({
    setup() {
        const user = ref<User | null>(null)
        const mostrarRanking = ref(false)
        const rankingTipo = ref<'points' | 'maps'>('points')
        const jogadores = ref<Player[]>([])

        const checkAuth = async () => {
            const token = localStorage.getItem('token')
            if (!token) {
                window.location.href = 'auth.html'
                return
            }

            try {
                const response = await fetch(`${BASE_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (response.ok) {
                    user.value = await response.json()
                } else {
                    localStorage.removeItem('token')
                    window.location.href = 'auth.html'
                }
            } catch (error) {
                console.error("Erro na autenticação:", error)
                window.location.href = 'auth.html'
            }
        }

        onMounted(checkAuth)

        const logout = () => {
            localStorage.removeItem('token')
            window.location.href = 'auth.html'
        }

        const irParaCriar = () => {
            window.location.href = 'editor.html'
        }

        const irParaMapas = (mine: boolean) => {
            const url = mine ? `maps.html?mine=true` : 'maps.html'
            window.location.href = url
        }

        const verRanking = async () => {
            mostrarRanking.value = true
            try {
                const response = await fetch(`${BASE_URL}/players/?sort_by=${rankingTipo.value}`)
                if (response.ok) {
                    jogadores.value = await response.json()
                }
            } catch (error) {
                console.error("Erro ao buscar o ranking da API:", error)
            }
        }

        const setRankingTipo = (tipo: 'points' | 'maps') => {
            rankingTipo.value = tipo
            verRanking()
        }

        return { user, logout, mostrarRanking, rankingTipo, jogadores, irParaCriar, irParaMapas, verRanking, setRankingTipo }
    }
}).mount('#app')