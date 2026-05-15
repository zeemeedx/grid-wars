import { createApp, ref, onMounted } from 'vue'

interface User {
    id: number;
    username: string;
}

interface MapData {
    id: number;
    owner_id: number;
    owner_username: string;
    points: number;
    grid: number[];
    completed: boolean;
}

createApp({
    setup() {
        const mapas = ref<MapData[]>([])
        const isMine = ref(false)

        const carregarMapas = async () => {
            const urlParams = new URLSearchParams(window.location.search)
            isMine.value = urlParams.get('mine') === 'true'
            const token = localStorage.getItem('token')
            
            let url = 'http://localhost:8000/maps/'
            if (isMine.value) {
                try {
                    const userRes = await fetch('http://localhost:8000/users/me', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    if (userRes.ok) {
                        const userData: User = await userRes.json()
                        url += `?owner_id=${userData.id}`
                    }
                } catch (e) { console.error(e) }
            }

            try {
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (response.ok) {
                    const allMaps: MapData[] = await response.json()
                    if (isMine.value) {
                        mapas.value = allMaps
                    } else {
                        // Filter out mine if it's "Jogar Mapas"
                        const userRes = await fetch('http://localhost:8000/users/me', {
                            headers: { 'Authorization': `Bearer ${token}` }
                        })
                        if (userRes.ok) {
                            const userData: User = await userRes.json()
                            mapas.value = allMaps.filter(m => m.owner_id !== userData.id)
                        } else {
                            mapas.value = allMaps
                        }
                    }
                }
            } catch (error) {
                console.error("Erro ao buscar mapas da API:", error)
            }
        }

        const jogarMapa = (id: number) => {
            const mode = isMine.value ? 'edit' : 'play'
            window.location.href = `editor.html?map_id=${id}&mode=${mode}`
        }

        const voltar = () => {
            window.location.href = 'index.html'
        }

        onMounted(() => {
            carregarMapas()
        })

        return { mapas, jogarMapa, isMine, voltar }
    }
}).mount('#app')