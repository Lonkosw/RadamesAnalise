 (function(){
  const API = '/funcionario';
  async function ping(){ try{ const r = await fetch(`${API}/ping`, {credentials:'include'}); return r.ok; }catch{return false;} }
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

  let editandoCpf = null;

  function f(msg, ok){
    feedback.textContent = msg;
    feedback.className = 'feedback ' + (ok ? 'ok':'error');
    feedback.hidden = false;
    setTimeout(()=> feedback.hidden = true, 4000);
  }

  async function carregar(){
    const ok = await ping();
    if(!ok){ f('Rota funcionario indisponível', false); tabelaBody.innerHTML=''; return; }
    const params = new URLSearchParams(new FormData(formFiltro));
    const res = await fetch(params.toString() ? `${API}?${params}`: API, {credentials:'include'});
    if(!res.ok){ f('Erro ao carregar','error'); return; }
    const data = await res.json();
    tabelaBody.innerHTML='';
    (Array.isArray(data)? data: []).forEach(r=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.cpf}</td>
        <td>${r.nome||''}</td>
        <td>${r.cargo||''}</td>
        <td>${r.salario!=null? Number(r.salario).toFixed(2):''}</td>
        <td>${r.porcentagem_comissao!=null? Number(r.porcentagem_comissao).toFixed(2):''}</td>
        <td class="acoes"><button class="mini" data-editar="${r.cpf}">Editar</button></td>`;
      tabelaBody.appendChild(tr);
    });
  }

  tabelaBody.addEventListener('click', async e=>{
    const btn = e.target.closest('button[data-editar]');
    if(!btn) return;
    const cpf = btn.getAttribute('data-editar');
    const res = await fetch(`${API}/${cpf}`, {credentials:'include'});
    if(!res.ok){ f('Falha ao obter registro'); return; }
    const d = await res.json();
    editandoCpf = d.cpf;
    tituloForm.textContent = 'Editar Funcionário';
    secForm.hidden = false;
    document.getElementById('cpf').value = d.cpf;
    document.getElementById('cpf').readOnly = true;
    document.getElementById('nome').value = d.nome||'';
    document.getElementById('cargo').value = d.cargo||'';
    document.getElementById('salario').value = d.salario!=null? d.salario: '';
    document.getElementById('porcentagem_comissao').value = d.porcentagem_comissao!=null? d.porcentagem_comissao: '';
    btnExcluir.hidden = false;
  });

  btnNovo.addEventListener('click', ()=>{
    editandoCpf = null;
    formRegistro.reset();
    document.getElementById('cpf').readOnly = false;
    btnExcluir.hidden = true;
    tituloForm.textContent = 'Novo Funcionário';
    secForm.hidden = false;
  });

  btnCancelar.addEventListener('click', ()=>{secForm.hidden = true;});
  btnLimparFiltro.addEventListener('click', ()=>{formFiltro.reset(); carregar();});
  btnRecarregar.addEventListener('click', carregar);
  formFiltro.addEventListener('submit', e=>{e.preventDefault();carregar();});

  formRegistro.addEventListener('submit', async e=>{
    e.preventDefault();
    const formData = new FormData(formRegistro);
    const payload = Object.fromEntries(formData.entries());
    // normalizar numéricos
    if(payload.salario==='') delete payload.salario; else payload.salario = Number(payload.salario);
    if(payload.porcentagem_comissao==='') delete payload.porcentagem_comissao; else payload.porcentagem_comissao = Number(payload.porcentagem_comissao);

    try {
      let res;
      if(editandoCpf){
        delete payload.cpf;
        res = await fetch(`${API}/${editandoCpf}`, {method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload)});
      } else {
        res = await fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload)});
      }
      if(!res.ok){
        const err = await res.json().catch(()=>({error:'Falha'}));
        f(err.error||'Erro', false);
        return;
      }
      f('Salvo', true);
      await carregar();
      secForm.hidden = true;
    } catch(err){ f('Erro rede', false); }
  });

  btnExcluir.addEventListener('click', async ()=>{
    if(!editandoCpf) return;
    if(!confirm('Excluir funcionário?')) return;
    const res = await fetch(`${API}/${editandoCpf}`, {method:'DELETE', credentials:'include'});
    if(!res.ok){ f('Falha excluir', false); return; }
    f('Excluído', true);
    await carregar();
    secForm.hidden = true;
  });

  document.addEventListener('DOMContentLoaded', carregar);
})();