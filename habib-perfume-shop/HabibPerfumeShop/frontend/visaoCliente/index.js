// ============================================================================
// index.js - Script da Área do Cliente - Habib Perfume Shop
// Modelo do Professor adaptado
// ============================================================================

const API_BASE = 'http://localhost:3001';

// Verificar se usuário está logado ao carregar página
document.addEventListener('DOMContentLoaded', async () => {
    await verificarLogin();
});

async function verificarLogin() {
    try {
        const response = await fetch(`${API_BASE}/login/status`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.status === 'ok' && data.usuario) {
            const usuario = data.usuario;
            document.getElementById('usuario-logado').textContent = `Olá, ${usuario.nome}!`;
            document.getElementById('mensagem-boas-vindas').textContent = 
                `Bem-vindo(a) de volta, ${usuario.nome}! Explore nossos perfumes.`;
        } else {
            // Não está logado, redirecionar para login
            window.location.href = '/login/login.html';
        }
    } catch (error) {
        console.error('Erro ao verificar login:', error);
        // Em caso de erro, redirecionar para login
        window.location.href = '/login/login.html';
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE}/login/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        // Limpar sessionStorage
        sessionStorage.clear();
        
        // Redirecionar para login
        window.location.href = '/login/login.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        window.location.href = '/login/login.html';
    }
}
