import { createApp, ref } from 'vue'
declare var process: any;

createApp({
    setup() {
        const isLogin = ref(true)
        const username = ref('')
        const password = ref('')

        const handleAuth = async () => {
            const endpoint = isLogin.value ? 'token' : 'register'
            
            try {
                let body: FormData | string;
                let headers: Record<string, string> = {};

                if (isLogin.value) {
                    // OAuth2PasswordRequestForm expects form-data
                    const formData = new FormData();
                    formData.append('username', username.value);
                    formData.append('password', password.value);
                    body = formData;
                } else {
                    body = JSON.stringify({ username: username.value, password: password.value });
                    headers['Content-Type'] = 'application/json';
                }

                const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
                const response = await fetch(`${BASE_URL}/${endpoint}`, {
                    method: 'POST',
                    headers: headers,
                    body: body
                })

                if (response.ok) {
                    const data = await response.json()
                    if (isLogin.value) {
                        localStorage.setItem('token', data.access_token)
                        window.location.href = 'index.html'
                    } else {
                        alert('Conta criada com sucesso! Agora faça login.')
                        isLogin.value = true
                        password.value = ''
                    }
                } else {
                    const error = await response.json()
                    alert(error.detail || 'Erro na autenticação')
                }
            } catch (error) {
                console.error("Erro:", error)
                alert('Erro ao conectar com o servidor')
            }
        }

        return { isLogin, username, password, handleAuth }
    }
}).mount('#app')