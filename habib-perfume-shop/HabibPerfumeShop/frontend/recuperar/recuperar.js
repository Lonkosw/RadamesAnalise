/**
 * ============================================
 * RECUPERAR.JS - Lógica de Recuperação de Senha
 * HabibPerfumeShop
 * ============================================
 */

const API_BASE_URL = 'http://localhost:3001';

// Estado da aplicação
let estado = {
  email: '',
  cpf: '',
  codigo: ''
};

// ============================================
// UTILIDADES
// ============================================

function setMensagem(texto, tipo = 'error') {
  const msg = document.getElementById('msg');
  msg.className = 'message message-' + tipo;
  msg.textContent = texto;
}

function limparMensagem() {
  const msg = document.getElementById('msg');
  msg.className = 'message';
  msg.textContent = '';
}

function setLoading(btnId, loading) {
  const btnTexto = document.getElementById(btnId + 'Texto');
  const btnLoading = document.getElementById(btnId + 'Loading');
  
  if (loading) {
    if (btnTexto) btnTexto.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline-block';
  } else {
    if (btnTexto) btnTexto.style.display = 'inline';
    if (btnLoading) btnLoading.style.display = 'none';
  }
}

function mostrarTela(numero) {
  // Esconder todas as telas
  document.querySelectorAll('.form-area').forEach(area => {
    area.classList.remove('active');
  });
  
  // Mostrar tela selecionada
  const tela = document.getElementById('tela' + numero);
  if (tela) {
    tela.classList.add('active');
  }
  
  // Atualizar indicadores de passo
  for (let i = 1; i <= 3; i++) {
    const indicator = document.getElementById('step' + i + '-indicator');
    if (indicator) {
      indicator.classList.remove('active', 'completed');
      if (i < numero) {
        indicator.classList.add('completed');
      } else if (i === numero) {
        indicator.classList.add('active');
      }
    }
  }
  
  limparMensagem();
}

function formatarCPF(valor) {
  // Remove tudo que não é número
  valor = valor.replace(/\D/g, '');
  
  // Limita a 11 dígitos
  valor = valor.substring(0, 11);
  
  // Aplica a máscara
  if (valor.length > 9) {
    valor = valor.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  } else if (valor.length > 6) {
    valor = valor.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  } else if (valor.length > 3) {
    valor = valor.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  }
  
  return valor;
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

// ============================================
// TELA 1: ENVIAR CÓDIGO
// ============================================

async function enviarCodigo() {
  limparMensagem();
  
  const email = document.getElementById('inputEmail').value.trim();
  
  if (!email) {
    setMensagem('Por favor, digite seu e-mail');
    return;
  }
  
  // Validação básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setMensagem('Por favor, digite um e-mail válido');
    return;
  }
  
  setLoading('btnEnviar', true);
  
  try {
    // Primeiro, buscar o CPF pelo email
    const resCpf = await fetch(`${API_BASE_URL}/recuperar/buscar-cpf-por-email?email=${encodeURIComponent(email)}`);
    const dataCpf = await resCpf.json();
    
    if (!resCpf.ok || !dataCpf.success) {
      setMensagem('E-mail não encontrado no sistema');
      setLoading('btnEnviar', false);
      return;
    }
    
    estado.cpf = dataCpf.cpf;
    
    // Agora enviar o código
    const res = await fetch(`${API_BASE_URL}/recuperar/iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await res.json();
    
    if (data.success) {
      estado.email = email;
      
      // Preencher o email na tela 2
      document.getElementById('emailEnviado').textContent = email;
      
      // Preencher CPF automaticamente
      document.getElementById('inputCpf').value = formatarCPF(estado.cpf);
      
      // Se estiver em modo debug, mostrar o código (apenas desenvolvimento)
      if (data.debug && data.debug.codigo) {
        console.log('🔐 Código de debug:', data.debug.codigo);
        setMensagem(`Código enviado! (Debug: ${data.debug.codigo})`, 'info');
      } else {
        setMensagem('Código enviado para seu e-mail!', 'success');
      }
      
      // Ir para tela 2 após pequeno delay
      setTimeout(() => {
        mostrarTela(2);
        document.getElementById('inputCodigo').focus();
      }, 1500);
      
    } else {
      setMensagem(data.mensagem || 'Erro ao enviar código');
    }
    
  } catch (error) {
    console.error('Erro:', error);
    setMensagem('Erro de conexão. Tente novamente.');
  }
  
  setLoading('btnEnviar', false);
}

// ============================================
// TELA 2: VALIDAR CÓDIGO
// ============================================

async function validarCodigo() {
  limparMensagem();
  
  const cpf = document.getElementById('inputCpf').value.replace(/\D/g, '');
  const codigo = document.getElementById('inputCodigo').value.trim();
  
  if (!cpf || cpf.length !== 11) {
    setMensagem('Por favor, digite um CPF válido (11 dígitos)');
    return;
  }
  
  if (!codigo || codigo.length !== 6 || !/^\d{6}$/.test(codigo)) {
    setMensagem('Por favor, digite o código de 6 dígitos');
    return;
  }
  
  setLoading('btnValidar', true);
  
  try {
    const res = await fetch(`${API_BASE_URL}/recuperar/validar-codigo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, codigo })
    });
    
    const data = await res.json();
    
    if (data.autorizado) {
      estado.cpf = cpf;
      estado.codigo = codigo;
      
      setMensagem('Código validado!', 'success');
      
      // Ir para tela 3
      setTimeout(() => {
        mostrarTela(3);
        document.getElementById('inputNovaSenha').focus();
      }, 800);
      
    } else {
      setMensagem(data.mensagem || 'Código inválido');
    }
    
  } catch (error) {
    console.error('Erro:', error);
    setMensagem('Erro de conexão. Tente novamente.');
  }
  
  setLoading('btnValidar', false);
}

async function reenviarCodigo() {
  if (!estado.email) {
    setMensagem('Erro: e-mail não definido');
    return;
  }
  
  setMensagem('Reenviando código...', 'info');
  
  try {
    const res = await fetch(`${API_BASE_URL}/recuperar/iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: estado.email })
    });
    
    const data = await res.json();
    
    if (data.success) {
      if (data.debug && data.debug.codigo) {
        setMensagem(`Novo código enviado! (Debug: ${data.debug.codigo})`, 'success');
      } else {
        setMensagem('Novo código enviado para seu e-mail!', 'success');
      }
    } else {
      setMensagem(data.mensagem || 'Erro ao reenviar código');
    }
    
  } catch (error) {
    console.error('Erro:', error);
    setMensagem('Erro de conexão. Tente novamente.');
  }
}

function voltarTela1() {
  estado.email = '';
  estado.cpf = '';
  estado.codigo = '';
  document.getElementById('inputEmail').value = '';
  document.getElementById('inputCpf').value = '';
  document.getElementById('inputCodigo').value = '';
  mostrarTela(1);
}

// ============================================
// TELA 3: REDEFINIR SENHA
// ============================================

async function redefinirSenha() {
  limparMensagem();
  
  const novaSenha = document.getElementById('inputNovaSenha').value;
  const confirmarSenha = document.getElementById('inputConfirmarSenha').value;
  
  if (!novaSenha || novaSenha.length < 4) {
    setMensagem('A senha deve ter pelo menos 4 caracteres');
    return;
  }
  
  if (novaSenha !== confirmarSenha) {
    setMensagem('As senhas não coincidem');
    return;
  }
  
  setLoading('btnRedefinir', true);
  
  try {
    const res = await fetch(`${API_BASE_URL}/recuperar/redefinir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cpf: estado.cpf,
        codigo: estado.codigo,
        novaSenha: novaSenha
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      // Mostrar tela de sucesso
      mostrarSucesso();
    } else {
      setMensagem(data.mensagem || 'Erro ao redefinir senha');
    }
    
  } catch (error) {
    console.error('Erro:', error);
    setMensagem('Erro de conexão. Tente novamente.');
  }
  
  setLoading('btnRedefinir', false);
}

function mostrarSucesso() {
  const container = document.querySelector('.login-container');
  container.innerHTML = `
    <div class="login-header">
      <h1>🌸 Habib Perfume Shop</h1>
    </div>
    
    <div class="success-animation">
      <div class="success-icon">✅</div>
      <h2 class="success-title">Senha Redefinida!</h2>
      <p class="success-text">Sua senha foi alterada com sucesso. Você já pode fazer login com sua nova senha.</p>
      <a href="../login/login.html" class="btn btn-primary btn-block">Ir para o Login</a>
    </div>
  `;
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Formatar CPF enquanto digita
  const inputCpf = document.getElementById('inputCpf');
  if (inputCpf) {
    inputCpf.addEventListener('input', (e) => {
      e.target.value = formatarCPF(e.target.value);
    });
  }
  
  // Limitar código a números
  const inputCodigo = document.getElementById('inputCodigo');
  if (inputCodigo) {
    inputCodigo.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
    });
  }
  
  // Enter para enviar
  document.getElementById('inputEmail')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enviarCodigo();
  });
  
  document.getElementById('inputCodigo')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') validarCodigo();
  });
  
  document.getElementById('inputConfirmarSenha')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') redefinirSenha();
  });
});
