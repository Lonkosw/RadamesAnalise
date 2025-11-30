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
    window.location.href = '/login/login.html';
    return false;
  }
}

// Elementos
const el = (q) => document.querySelector(q);
const filtro = el('#filtro');
const tabela = el('#tabela tbody');
const secForm = el('#secForm');
const form = el('#formRegistro');
const feedback = el('#feedback');

// Utilitários
function showFeedback(msg, type = 'danger') {
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
  try {
    const url = q ? `${API}?q=${encodeURIComponent(q)}` : API;
    const dados = await fetchJson(url);
    renderTabela(dados || []);
  } catch (e) {
    showFeedback(e.error || 'Erro ao carregar cargos');
  }
}

function renderTabela(dados) {
  tabela.innerHTML = '';
  if (dados.length === 0) {
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
  const sessaoOk = await verificarSessao();
  if (!sessaoOk) return;
  
  carregar();

  // Buscar
  el('#btnBuscar').onclick = () => carregar(filtro.value.trim());
  el('#btnLimpar').onclick = () => { filtro.value = ''; carregar(); };
  el('#btnRecarregar').onclick = () => carregar(filtro.value.trim());

  // Novo
  el('#btnNovo').onclick = () => {
    el('#tituloForm').textContent = 'Novo Cargo';
    form.reset();
    el('#idCargo').value = '';
    el('#btnExcluir').hidden = true;
    secForm.classList.remove('hidden');
    el('#nome_cargo').focus();
  };

  // Cancelar
  el('#btnCancelar').onclick = () => {
    secForm.classList.add('hidden');
    form.reset();
  };

  // Editar (delegação)
  tabela.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-editar]');
    if (!btn) return;
    
    const id = btn.getAttribute('data-editar');
    try {
      const cargo = await obter(id);
      el('#tituloForm').textContent = 'Editar Cargo';
      el('#idCargo').value = cargo.id_cargo;
      el('#nome_cargo').value = cargo.nome_cargo || '';
      el('#btnExcluir').hidden = false;
      secForm.classList.remove('hidden');
      el('#nome_cargo').focus();
    } catch (e) {
      showFeedback(e.error || 'Erro ao carregar cargo');
    }
  });

  // Salvar
  form.onsubmit = async (e) => {
    e.preventDefault();
    const id = el('#idCargo').value;
    const payload = { nome_cargo: el('#nome_cargo').value.trim() };

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
      secForm.classList.add('hidden');
      carregar(filtro.value.trim());
    } catch (e) {
      showFeedback(e.error || 'Erro ao salvar cargo');
    }
  };

  // Excluir
  el('#btnExcluir').onclick = async () => {
    const id = el('#idCargo').value;
    if (!id) return;
    
    if (!confirm('Tem certeza que deseja excluir este cargo?')) return;
    
    try {
      await excluir(id);
      showFeedback('✓ Cargo excluído com sucesso!', 'success');
      secForm.classList.add('hidden');
      carregar(filtro.value.trim());
    } catch (e) {
      showFeedback(e.error || 'Erro ao excluir cargo');
    }
  };
});

// Logout
function logout() {
  document.cookie = 'usuarioLogado=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  window.location.href = '/login/login.html';
}
