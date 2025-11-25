(()=>{
  const API = '/forma_pagamento';
  const body = document.querySelector('#tabela tbody');
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

  let editandoId = null;

  function fb(msg, ok){
    feedback.textContent = msg;
    feedback.className = 'feedback ' + (ok?'ok':'error');
    feedback.hidden = false;
    setTimeout(()=> feedback.hidden = true, 3500);
  }

  async function carregar(){
    const params = new URLSearchParams(new FormData(formFiltro));
    const res = await fetch(params.toString()? `${API}?${params}`: API);
    if(!res.ok){ fb('Erro ao carregar', false); return; }
    const data = await res.json();
    body.innerHTML='';
    (data||[]).forEach(f=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${f.id_forma_pagamento}</td>
        <td>${f.nome_forma}</td>
        <td class="acoes"><button class="mini" data-editar="${f.id_forma_pagamento}">Editar</button></td>`;
      body.appendChild(tr);
    });
  }

  body.addEventListener('click', async e=>{
    const btn = e.target.closest('button[data-editar]');
    if(!btn) return;
    const id = btn.getAttribute('data-editar');
    const res = await fetch(`${API}/${id}`);
    if(!res.ok){ fb('Falha ao obter', false); return; }
    const item = await res.json();
    editandoId = item.id_forma_pagamento;
    document.getElementById('id_forma_pagamento').value = item.id_forma_pagamento;
    document.getElementById('nome_forma').value = item.nome_forma;
    tituloForm.textContent = 'Editar Forma';
    btnExcluir.hidden = false;
    secForm.hidden = false;
  });

  btnNovo.addEventListener('click', ()=>{
    formRegistro.reset();
    editandoId = null;
    document.getElementById('id_forma_pagamento').value='';
    tituloForm.textContent = 'Nova Forma';
    btnExcluir.hidden = true;
    secForm.hidden = false;
  });

  btnCancelar.addEventListener('click', ()=>{ secForm.hidden = true; });
  btnLimparFiltro.addEventListener('click', ()=>{ formFiltro.reset(); carregar(); });
  btnRecarregar.addEventListener('click', carregar);
  formFiltro.addEventListener('submit', e=>{ e.preventDefault(); carregar(); });

  formRegistro.addEventListener('submit', async e=>{
    e.preventDefault();
    const payload = { nome_forma: document.getElementById('nome_forma').value };
    let res;
    if(editandoId){
      res = await fetch(`${API}/${editandoId}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    } else {
      res = await fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    }
    if(!res.ok){ const err = await res.json().catch(()=>({error:'Erro'})); fb(err.error||'Falha', false); return; }
    fb('Salvo', true);
    await carregar();
    secForm.hidden = true;
  });

  btnExcluir.addEventListener('click', async ()=>{
    if(!editandoId) return;
    if(!confirm('Excluir forma?')) return;
    const res = await fetch(`${API}/${editandoId}`, {method:'DELETE'});
    if(!res.ok){ fb('Falha excluir', false); return; }
    fb('Excluída', true);
    await carregar();
    secForm.hidden = true;
  });

  document.addEventListener('DOMContentLoaded', carregar);
})();