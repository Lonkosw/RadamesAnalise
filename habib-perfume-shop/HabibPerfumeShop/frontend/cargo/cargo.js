/**
 * cargo.js - CRUD de Cargos
 * Habib Perfume Shop
 */

const API = '/cargo';

// Verificar sessão ao carregar
async function verificarSessao() {
  try {
    const r = await fetch('/login/status', { credentials: 'include' });
    const data = await r.json();
    if (data.status !== 'ok') {
      window.location.href = '/login/login.html';
      return false;
    }
    // Verificar se é funcionário (gerente)
    if (data.usuario.tipo !== 'funcionario') {
      alert('Acesso restrito a funcionários');
      window.location.href = '/menu';
      return false;
    }
    // Atualizar nome do usuário no header
    const nomeEl = document.getElementById('nomeUsuario');
    if (nomeEl && data.usuario) {
      nomeEl.textContent = data.usuario.nome || 'Gerente';
    }
    return true;
  } catch (e) {
    console.error('Erro ao verificar sessão:', e);
    window.location.href = '/login/login.html';
    return false;
  }
}

// Utilitários
const el = (q) => document.querySelector(q);

function showFeedback(msg, type = 'danger') {
  const feedback = el('#feedback');
  if (!feedback) return;
  feedback.textContent = msg;
  feedback.className = `alert alert-${type}`;
  feedback.classList.remove('hidden');
  setTimeout(() => feedback.classList.add('hidden'), 4000);
}

async function fetchJson(url, opts = {}) {
  opts.credentials = 'include';
  const r = await fetch(url, opts);
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw err;
  }
  if (r.status === 204) return null;
  return r.json();
}

// Carregar lista
async function carregar(q = '') {
  const tabela = el('#tabela tbody');
  if (!tabela) {
    console.error('Tabela não encontrada');
    return;
  }
  try {
    const url = q ? `${API}?q=${encodeURIComponent(q)}` : API;
    console.log('Carregando cargos de:', url);
    const dados = await fetchJson(url);
    console.log('Dados recebidos:', dados);
    renderTabela(dados || []);
  } catch (e) {
    console.error('Erro ao carregar cargos:', e);
    showFeedback(e.error || 'Erro ao carregar cargos');
  }
}

function renderTabela(dados) {
  const tabela = el('#tabela tbody');
  if (!tabela) {
    console.error('Tabela não encontrada no renderTabela');
    return;
  }
  tabela.innerHTML = '';
  if (!dados || dados.length === 0) {
    tabela.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Nenhum cargo encontrado</td></tr>';
    return;
  }
  dados.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.id_cargo}</td>
      <td>${c.nome_cargo || ''}</td>
      <td style="text-align: center;">
        <button class="btn btn-sm btn-warning" data-editar="${c.id_cargo}">✏️ Editar</button>
      </td>
    `;
    tabela.appendChild(tr);
  });
  console.log('Tabela renderizada com', dados.length, 'registros');
}

// CRUD
async function obter(id) {
  return fetchJson(`${API}/${id}`);
}

async function criar(payload) {
  return fetchJson(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function atualizar(id, payload) {
  return fetchJson(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function excluir(id) {
  return fetchJson(`${API}/${id}`, { method: 'DELETE' });
}

// Eventos
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM carregado - iniciando cargo.js');
  
  const sessaoOk = await verificarSessao();
  if (!sessaoOk) return;
  
  console.log('Sessão OK - carregando cargos...');
  await carregar();

  // Elementos do DOM
  const filtro = el('#filtro');
  const tabela = el('#tabela tbody');
  const secForm = el('#secForm');
  const form = el('#formRegistro');

  // Buscar
  const btnBuscar = el('#btnBuscar');
  if (btnBuscar) btnBuscar.onclick = () => carregar(filtro?.value?.trim() || '');
  
  const btnLimpar = el('#btnLimpar');
  if (btnLimpar) btnLimpar.onclick = () => { if (filtro) filtro.value = ''; carregar(); };
  
  const btnRecarregar = el('#btnRecarregar');
  if (btnRecarregar) btnRecarregar.onclick = () => carregar(filtro?.value?.trim() || '');

  // Novo
  const btnNovo = el('#btnNovo');
  if (btnNovo) btnNovo.onclick = () => {
    const tituloForm = el('#tituloForm');
    if (tituloForm) tituloForm.textContent = 'Novo Cargo';
    if (form) form.reset();
    const idCargo = el('#idCargo');
    if (idCargo) idCargo.value = '';
    const btnExcluir = el('#btnExcluir');
    if (btnExcluir) btnExcluir.hidden = true;
    if (secForm) secForm.classList.remove('hidden');
    const nomeCargo = el('#nome_cargo');
    if (nomeCargo) nomeCargo.focus();
  };

  // Cancelar
  const btnCancelar = el('#btnCancelar');
  if (btnCancelar) btnCancelar.onclick = () => {
    if (secForm) secForm.classList.add('hidden');
    if (form) form.reset();
  };

  // Editar (delegação)
  if (tabela) {
    tabela.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-editar]');
      if (!btn) return;
      
      const id = btn.getAttribute('data-editar');
      try {
        const cargo = await obter(id);
        const tituloForm = el('#tituloForm');
        if (tituloForm) tituloForm.textContent = 'Editar Cargo';
        const idCargo = el('#idCargo');
        if (idCargo) idCargo.value = cargo.id_cargo;
        const nomeCargo = el('#nome_cargo');
        if (nomeCargo) nomeCargo.value = cargo.nome_cargo || '';
        const btnExcluir = el('#btnExcluir');
        if (btnExcluir) btnExcluir.hidden = false;
        if (secForm) secForm.classList.remove('hidden');
        if (nomeCargo) nomeCargo.focus();
      } catch (e) {
        showFeedback(e.error || 'Erro ao carregar cargo');
      }
    });
  }

  // Salvar
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const idCargo = el('#idCargo');
      const nomeCargo = el('#nome_cargo');
      const id = idCargo?.value;
      const payload = { nome_cargo: nomeCargo?.value?.trim() || '' };

      if (!payload.nome_cargo) {
        showFeedback('Nome do cargo é obrigatório');
        return;
      }

      try {
        if (id) {
          await atualizar(id, payload);
          showFeedback('✓ Cargo atualizado com sucesso!', 'success');
        } else {
          await criar(payload);
          showFeedback('✓ Cargo criado com sucesso!', 'success');
        }
        if (secForm) secForm.classList.add('hidden');
        carregar(filtro?.value?.trim() || '');
      } catch (e) {
        showFeedback(e.error || 'Erro ao salvar cargo');
      }
    };
  }

  // Excluir
  const btnExcluir = el('#btnExcluir');
  if (btnExcluir) {
    btnExcluir.onclick = async () => {
      const idCargo = el('#idCargo');
      const id = idCargo?.value;
      if (!id) return;
      
      if (!confirm('Tem certeza que deseja excluir este cargo?')) return;
      
      try {
        await excluir(id);
        showFeedback('✓ Cargo excluído com sucesso!', 'success');
        if (secForm) secForm.classList.add('hidden');
        carregar(filtro?.value?.trim() || '');
      } catch (e) {
        showFeedback(e.error || 'Erro ao excluir cargo');
      }
    };
  }
});

// Logout
function logout() {
  document.cookie = 'usuarioLogado=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  window.location.href = '/login/login.html';
}
