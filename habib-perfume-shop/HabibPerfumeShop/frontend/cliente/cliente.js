 (function(){
  const API = '/cliente';
  async function ping(){
    try { const r = await fetch(`${API}/ping`, {credentials:'include'}); return r.ok; } catch { return false; }
  }
  const tabelaBody = document.querySelector('#tabela tbody');
  const formFiltro = document.getElementById('formFiltro');
  const formRegistro = document.getElementById('formRegistro');
  const feedback = document.getElementById('feedback');
  const secForm = document.getElementById('secForm');
  const tituloForm = document.getElementById('tituloForm');
  const btnNovo = document.getElementById('btnNovo');
  const btnCancelar = document.getElementById('btnCancelar');
  const btnExcluir = document.getElementById('btnExcluir');
  const btnLimparFiltro = document.getElementById('btnLimparFiltro');
  const btnRecarregar = document.getElementById('btnRecarregar');
  const senhaWrapper = document.getElementById('senhaWrapper');

  let editandoCpf = null;

  function showFeedback(msg, ok){
    feedback.textContent = msg;
    feedback.className = 'feedback ' + (ok? 'ok':'error');
    feedback.hidden = false;
    setTimeout(()=>{feedback.hidden=true;}, 4000);
  }

  function limparForm(){
    formRegistro.reset();
    editandoCpf = null;
    btnExcluir.hidden = true;
    senhaWrapper.hidden = false; // senha só ao criar
    document.getElementById('cpf').readOnly = false;
    document.getElementById('senha').required = true;
    tituloForm.textContent = 'Novo Cliente';
  }

  async function carregar(){
    const ok = await ping();
    if(!ok){ showFeedback('Rota cliente indisponível','error'); tabelaBody.innerHTML=''; return; }
    const params = new URLSearchParams(new FormData(formFiltro));
    const url = params.toString() ? `${API}?${params}`: API;
    const res = await fetch(url, {credentials:'include'});
    if(!res.ok){
      showFeedback('Erro ao carregar clientes','error');
      return;
    }
    const data = await res.json();
    tabelaBody.innerHTML = '';
    (Array.isArray(data)? data: []).forEach(c=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.cpf}</td>
        <td>${c.nome||''}</td>
        <td>${c.email||''}</td>
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
      secForm.hidden = false;
      document.getElementById('cpf').value = cli.cpf;
      document.getElementById('cpf').readOnly = true;
      document.getElementById('nome').value = cli.nome||'';
      document.getElementById('email').value = cli.email||'';
      senhaWrapper.hidden = true; // não mostrar campo senha ao editar aqui
      document.getElementById('senha').required = false;
      btnExcluir.hidden = false;
    }
  });

  btnNovo.addEventListener('click', ()=>{
    secForm.hidden = false;
    limparForm();
  });

  btnCancelar.addEventListener('click', ()=>{
    secForm.hidden = true;
    limparForm();
  });

  btnLimparFiltro.addEventListener('click', ()=>{
    formFiltro.reset();
    carregar();
  });

  btnRecarregar.addEventListener('click', carregar);

  formFiltro.addEventListener('submit', (e)=>{e.preventDefault();carregar();});

  formRegistro.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const formData = new FormData(formRegistro);
    const payload = Object.fromEntries(formData.entries());

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
      secForm.hidden = true;
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
    secForm.hidden = true;
    limparForm();
  });

  document.addEventListener('DOMContentLoaded', carregar);
})();