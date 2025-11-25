// Componente de navegação global para todas as páginas
class Navigation {
    constructor() {
        this.createFixedButtons();
        this.createBackButton();
        this.checkUserStatus();
    }

    // Cria os botões fixos no canto superior direito
    createFixedButtons() {
        const fixedNav = document.createElement('div');
        fixedNav.id = 'fixed-nav';
        fixedNav.innerHTML = `
            <div class="fixed-nav-container">
                <button id="loginBtn" class="nav-btn login-btn" onclick="Navigation.goToLogin()">
                    <i class="icon">👤</i> Entrar
                </button>
                <button id="registerBtn" class="nav-btn register-btn" onclick="Navigation.goToRegister()">
                    <i class="icon">📝</i> Cadastrar
                </button>
                <button id="userBtn" class="nav-btn user-btn" style="display: none;" onclick="Navigation.toggleUserMenu()">
                    <i class="icon">👤</i> <span id="userName"></span>
                </button>
                <div id="userMenu" class="user-menu" style="display: none;">
                    <div class="user-info">
                        <span id="userType"></span>
                    </div>
                    <button onclick="Navigation.goToMenu()">Menu Principal</button>
                    <button onclick="Navigation.logout()">Sair</button>
                </div>
            </div>
        `;

        // Adiciona estilos CSS
        const style = document.createElement('style');
        style.textContent = `
            #fixed-nav {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
            }

            .fixed-nav-container {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .nav-btn {
                padding: 10px 15px;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                transition: all 0.3s ease;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .login-btn {
                background: linear-gradient(45deg, #4CAF50, #45a049);
                color: white;
            }

            .register-btn {
                background: linear-gradient(45deg, #2196F3, #1976D2);
                color: white;
            }

            .user-btn {
                background: linear-gradient(45deg, #FF9800, #F57C00);
                color: white;
                position: relative;
            }

            .nav-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }

            .user-menu {
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border-radius: 10px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                padding: 15px;
                min-width: 200px;
                margin-top: 10px;
            }

            .user-info {
                padding: 10px 0;
                border-bottom: 1px solid #eee;
                margin-bottom: 10px;
                font-weight: bold;
                color: #333;
            }

            .user-menu button {
                width: 100%;
                padding: 8px 12px;
                margin: 5px 0;
                border: none;
                border-radius: 5px;
                background: #f5f5f5;
                cursor: pointer;
                transition: background 0.3s;
            }

            .user-menu button:hover {
                background: #e0e0e0;
            }

            .back-btn {
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 999;
                background: rgba(0,0,0,0.7);
                color: white;
                border: none;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                cursor: pointer;
                font-size: 20px;
                transition: all 0.3s ease;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }

            .back-btn:hover {
                background: rgba(0,0,0,0.9);
                transform: scale(1.1);
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(fixedNav);
    }

    // Cria botão de voltar (seta)
    createBackButton() {
        // Não mostrar na página inicial
        if (window.location.pathname.endsWith('index.html') || 
            window.location.pathname === '/' || 
            window.location.pathname.endsWith('/')) {
            return;
        }

        const backBtn = document.createElement('button');
        backBtn.className = 'back-btn';
        backBtn.innerHTML = '←';
        backBtn.title = 'Voltar';
        backBtn.onclick = () => Navigation.goBack();
        document.body.appendChild(backBtn);
    }

    // Verifica status do usuário logado
    async checkUserStatus() {
        try {
            const response = await fetch('http://localhost:3001/login/status', {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.status === 'ok') {
                this.showUserLoggedIn(data.usuario);
            } else {
                this.showLoginButtons();
            }
        } catch (error) {
            console.log('Usuário não logado ou servidor offline');
            this.showLoginButtons();
        }
    }

    showLoginButtons() {
        document.getElementById('loginBtn').style.display = 'flex';
        document.getElementById('registerBtn').style.display = 'flex';
        document.getElementById('userBtn').style.display = 'none';
    }

    showUserLoggedIn(usuario) {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('registerBtn').style.display = 'none';
        document.getElementById('userBtn').style.display = 'flex';
        document.getElementById('userName').textContent = usuario.nome;
        
        // Determinar tipo de usuário (flag gerente independente do tipo)
        let userType = '';
        if (usuario.tipo === 'cliente') {
            userType = '👤 Cliente';
        } else if (usuario.tipo === 'funcionario') {
            if (usuario.gerente || (usuario.cargo && usuario.cargo.toLowerCase().includes('gerente'))) {
                userType = '👨‍💼 Gerente';
            } else {
                userType = '👥 Funcionário';
            }
        } else {
            userType = '👤 Usuário';
        }
        document.getElementById('userType').textContent = userType;
    }

    // Métodos estáticos para navegação
    static goToLogin() {
        window.location.href = Navigation.getBasePath() + '/frontend/login/login.html';
    }

    static goToRegister() {
        window.location.href = Navigation.getBasePath() + '/frontend/login/login.html?cadastro=true';
    }

    static goToMenu() {
        window.location.href = Navigation.getBasePath() + '/frontend/menu.html';
    }

    static goBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = Navigation.getBasePath() + '/index.html';
        }
    }

    static toggleUserMenu() {
        const menu = document.getElementById('userMenu');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }

    static async logout() {
        try {
            await fetch('http://localhost:3001/login/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.log('Erro ao fazer logout');
        }
        window.location.href = Navigation.getBasePath() + '/index.html';
    }

    static getBasePath() {
        const path = window.location.pathname;
        if (path.includes('/frontend/')) {
            return '../..';
        } else if (path.includes('/backend/')) {
            return '..';
        }
        return '.';
    }
}

// Inicializar navegação quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
});

// Fechar menu do usuário ao clicar fora
document.addEventListener('click', (e) => {
    const userMenu = document.getElementById('userMenu');
    const userBtn = document.getElementById('userBtn');
    if (userMenu && userBtn && !userBtn.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.style.display = 'none';
    }
});