(()=>{
  const API = '/pedido_has_produto';
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

  let editandoPK = null; // composta (pedido_id_pedido, produto_id_produto)

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
    (data||[]).forEach(i=>{
      const total = Number(i.preco_unitario)*Number(i.quantidade);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i.pedido_id_pedido}</td>
        <td>${i.produto_id_produto}</td>
        <td>${i.quantidade}</td>
        <td>${Number(i.preco_unitario).toFixed(2)}</td>
        <td>${total.toFixed(2)}</td>
        <td class="acoes"><button class="mini" data-editar-pedido="${i.pedido_id_pedido}" data-editar-produto="${i.produto_id_produto}">Editar</button></td>`;
      body.appendChild(tr);
    });
  }

  body.addEventListener('click', async e=>{
    const btn = e.target.closest('button[data-editar-pedido]');
    if(!btn) return;
    const pedidoId = btn.getAttribute('data-editar-pedido');
    const produtoId = btn.getAttribute('data-editar-produto');
    const res = await fetch(`${API}/pedido/${pedidoId}/produto/${produtoId}`);
    if(!res.ok){ fb('Falha ao obter', false); return; }
    const item = await res.json();
    editandoPK = { pedido_id_pedido: item.pedido_id_pedido, produto_id_produto: item.produto_id_produto };
    document.getElementById('id_pedido').value = item.pedido_id_pedido;
    document.getElementById('id_produto').value = item.produto_id_produto;
    document.getElementById('quantidade').value = item.quantidade;
    document.getElementById('preco_unitario').value = item.preco_unitario;
    tituloForm.textContent = 'Editar Associação';
    btnExcluir.hidden = false;
    secForm.hidden = false;
  });

  btnNovo.addEventListener('click', ()=>{
    formRegistro.reset();
    editandoPK = null;
    tituloForm.textContent = 'Associar Produto';
    btnExcluir.hidden = true;
    secForm.hidden = false;
  });

  btnCancelar.addEventListener('click', ()=>{ secForm.hidden = true; });
  btnLimparFiltro.addEventListener('click', ()=>{ formFiltro.reset(); carregar(); });
  btnRecarregar.addEventListener('click', carregar);
  formFiltro.addEventListener('submit', e=>{ e.preventDefault(); carregar(); });

  formRegistro.addEventListener('submit', async e=>{
    e.preventDefault();
    const payload = {
      pedido_id_pedido: Number(document.getElementById('id_pedido').value),
      produto_id_produto: Number(document.getElementById('id_produto').value),
      quantidade: Number(document.getElementById('quantidade').value),
      preco_unitario: Number(document.getElementById('preco_unitario').value)
    };
    let res;
    if(editandoPK){
      res = await fetch(`${API}/pedido/${editandoPK.pedido_id_pedido}/produto/${editandoPK.produto_id_produto}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({quantidade: payload.quantidade, preco_unitario: payload.preco_unitario})});
    } else {
      res = await fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    }
    if(!res.ok){ const err = await res.json().catch(()=>({error:'Erro'})); fb(err.error||'Falha', false); return; }
    fb('Salvo', true);
    await carregar();
    secForm.hidden = true;
  });

  btnExcluir.addEventListener('click', async ()=>{
    if(!editandoPK) return;
    if(!confirm('Remover associação?')) return;
    const res = await fetch(`${API}/pedido/${editandoPK.pedido_id_pedido}/produto/${editandoPK.produto_id_produto}`, {method:'DELETE'});
    if(!res.ok){ fb('Falha remover', false); return; }
    fb('Removido', true);
    await carregar();
    secForm.hidden = true;
  });

  document.addEventListener('DOMContentLoaded', carregar);
})();