/**
 * cliente.js - CRUD de Clientes
 * Habib Perfume Shop
 */
(function(){
  const API = '/cliente';
  
  // Verificar sessão ao carregar
  async function verificarSessao() {
    try {
      const r = await fetch('/login/status', { credentials: 'include' });
      const data = await r.json();
      if (data.status !== 'ok') {
        window.location.href = '/login/login.html';
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

  async function ping(){
    try { const r = await fetch(`${API}/ping`, {credentials:'include'}); return r.ok; } catch { return false; }
  }
  
  const tabelaBody = document.querySelector('#tabela tbody');
  const formRegistro = document.getElementById('formRegistro');
  const feedback = document.getElementById('feedback');
  const secForm = document.getElementById('secForm');
  const tituloForm = document.getElementById('tituloForm');
  const btnNovo = document.getElementById('btnNovo');
  const btnCancelar = document.getElementById('btnCancelar');
  const btnExcluir = document.getElementById('btnExcluir');
  const btnLimparFiltro = document.getElementById('btnLimparFiltro');
  const btnRecarregar = document.getElementById('btnRecarregar');
  const btnBuscar = document.getElementById('btnBuscar');
  const filtroInput = document.getElementById('f_q');
  const senhaWrapper = document.getElementById('senhaWrapper');

  let editandoCpf = null;

  function showFeedback(msg, ok){
    feedback.textContent = msg;
    feedback.className = 'alert ' + (ok ? 'alert-success' : 'alert-danger');
    feedback.classList.remove('hidden');
    setTimeout(()=>{ feedback.classList.add('hidden'); }, 4000);
  }

  function limparForm(){
    formRegistro.reset();
    editandoCpf = null;
    if (btnExcluir) btnExcluir.classList.add('hidden');
    if (senhaWrapper) senhaWrapper.classList.remove('hidden');
    document.getElementById('cpf').readOnly = false;
    const senhaEl = document.getElementById('senha');
    if (senhaEl) senhaEl.required = true;
    document.getElementById('data_nascimento').value = '';
    document.getElementById('renda_cliente').value = '';
    tituloForm.textContent = 'Novo Cliente';
  }

  async function carregar(){
    const ok = await ping();
    if(!ok){ showFeedback('Rota cliente indisponível', false); tabelaBody.innerHTML=''; return; }
    
    // Pegar valor do filtro diretamente do input
    const q = filtroInput ? filtroInput.value.trim() : '';
    const url = q ? `${API}?q=${encodeURIComponent(q)}` : API;
    const res = await fetch(url, {credentials:'include'});
    if(!res.ok){
      showFeedback('Erro ao carregar clientes','error');
      return;
    }
    const data = await res.json();
    tabelaBody.innerHTML = '';
    (Array.isArray(data)? data: []).forEach(c=>{
      const tr = document.createElement('tr');
      const nascFmt = c.data_nascimento ? new Date(c.data_nascimento).toLocaleDateString('pt-BR') : '';
      const rendaFmt = c.renda_cliente != null ? Number(c.renda_cliente).toLocaleString('pt-BR', {style:'currency',currency:'BRL'}) : '';
      tr.innerHTML = `
        <td>${c.cpf}</td>
        <td>${c.nome||''}</td>
        <td>${c.email||''}</td>
        <td>${nascFmt}</td>
        <td>${rendaFmt}</td>
        <td class="acoes">\n          <button class="mini" data-editar="${c.cpf}">Editar</button>\n        </td>`;
      tabelaBody.appendChild(tr);
    });
  }

  tabelaBody.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-editar]');
    if(btn){
      const cpf = btn.getAttribute('data-editar');
      const res = await fetch(`${API}/${cpf}`, {credentials:'include'});
      if(!res.ok){
        showFeedback('Falha ao obter cliente','error');
        return;
      }
      const cli = await res.json();
      editandoCpf = cli.cpf;
      tituloForm.textContent = 'Editar Cliente';
      secForm.classList.remove('hidden');
      document.getElementById('cpf').value = cli.cpf;
      document.getElementById('cpf').readOnly = true;
      document.getElementById('nome').value = cli.nome||'';
      document.getElementById('email').value = cli.email||'';
      document.getElementById('data_nascimento').value = cli.data_nascimento ? cli.data_nascimento.split('T')[0] : '';
      document.getElementById('renda_cliente').value = cli.renda_cliente != null ? cli.renda_cliente : '';
      if (senhaWrapper) senhaWrapper.classList.add('hidden'); // não mostrar campo senha ao editar aqui
      document.getElementById('senha').required = false;
      if (btnExcluir) btnExcluir.classList.remove('hidden');
    }
  });

  btnNovo.addEventListener('click', ()=>{
    secForm.classList.remove('hidden');
    limparForm();
  });

  btnCancelar.addEventListener('click', ()=>{
    secForm.classList.add('hidden');
    limparForm();
  });

  // Eventos de filtro
  if (btnBuscar) {
    btnBuscar.addEventListener('click', () => carregar());
  }
  
  if (btnLimparFiltro) {
    btnLimparFiltro.addEventListener('click', () => {
      if (filtroInput) filtroInput.value = '';
      carregar();
    });
  }

  if (btnRecarregar) {
    btnRecarregar.addEventListener('click', carregar);
  }
  
  // Enter no campo de filtro
  if (filtroInput) {
    filtroInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        carregar();
      }
    });
  }

  formRegistro.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const formData = new FormData(formRegistro);
    const payload = Object.fromEntries(formData.entries());
    
    // Processar campos numéricos e datas
    if(payload.renda_cliente === '') delete payload.renda_cliente; 
    else if(payload.renda_cliente) payload.renda_cliente = Number(payload.renda_cliente);
    if(payload.data_nascimento === '') delete payload.data_nascimento;

    try {
      let res;
      if(editandoCpf){
        // update (sem senha aqui)
        delete payload.cpf; // chave no path
        delete payload.senha; // alteração de senha fica para outra tela
        res = await fetch(`${API}/${editandoCpf}`, {
          method:'PUT',
          headers:{'Content-Type':'application/json'},
          credentials:'include',
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(API, {
          method:'POST',
            headers:{'Content-Type':'application/json'},
            credentials:'include',
            body: JSON.stringify(payload)
        });
      }
      if(!res.ok){
        const err = await res.json().catch(()=>({error:'Erro desconhecido'}));
        showFeedback(err.error||'Falha na operação', false);
        return;
      }
      showFeedback('Salvo com sucesso', true);
      await carregar();
      secForm.classList.add('hidden');
      limparForm();
    } catch(err){
      showFeedback('Erro de rede', false);
    }
  });

  btnExcluir.addEventListener('click', async ()=>{
    if(!editandoCpf) return;
    if(!confirm('Confirma exclusão do cliente?')) return;
    const res = await fetch(`${API}/${editandoCpf}`, {method:'DELETE', credentials:'include'});
    if(!res.ok){
      const err = await res.json().catch(()=>({error:'Erro'}));
      showFeedback(err.error||'Falha ao excluir', false);
      return;
    }
    showFeedback('Excluído', true);
    await carregar();
    secForm.classList.add('hidden');
    limparForm();
  });

  // Inicialização
  document.addEventListener('DOMContentLoaded', async () => {
    const sessaoOk = await verificarSessao();
    if (sessaoOk) {
      carregar();
    }
  });
  
  // Logout global
  window.logout = function() {
    document.cookie = 'usuarioLogado=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login/login.html';
  };
})();