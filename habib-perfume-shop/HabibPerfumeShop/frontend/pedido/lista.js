const API_BASE = 'http://localhost:3001';
let _usuario=null;
function fmtMoeda(v){ return 'R$ ' + Number(v||0).toFixed(2).replace('.',','); }

async function carregarUsuario(){
  try{ const r = await fetch(API_BASE + '/login/status',{credentials:'include'}); const d = await r.json(); if(d.status==='ok'){ _usuario=d.usuario; return; } }catch(e){console.error(e);} 
  window.location.href='/login/login.html';
}

async function carregarPedidos(){
  const tbody = document.querySelector('#tblPedidos tbody');
  const vazio = document.getElementById('estadoVazio');
  tbody.innerHTML='';
  let url;
  if(_usuario.tipo==='cliente') {
    url = API_BASE + '/pedido/cliente/' + _usuario.cpf;
  } else {
    // Funcionário / gerente visualiza todos os pedidos
    url = API_BASE + '/pedido';
  }
  console.log('[listaPedidos] buscando', url);
  try{
    const r = await fetch(url,{credentials:'include'});
    if(!r.ok){
      let msg = `Falha ao buscar pedidos (${r.status})`;
      try { const err = await r.json(); if(err && err.error) msg += `: ${err.error}`; } catch {}
      console.warn('[listaPedidos] erro', msg);
      vazio.textContent = msg;
      vazio.classList.remove('hidden');
      return;
    }
    const data = await r.json();
    if(!data.length){ vazio.classList.remove('hidden'); return; }
    vazio.classList.add('hidden');
    data.forEach(p=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.id_pedido}</td><td>${new Date(p.data_pedido).toLocaleString()}</td><td>${fmtMoeda(p.total||0)}</td><td>${p.status}</td><td><a class="link-acoes" href="/pedido/pedido.html?id=${p.id_pedido}">Ver</a></td>`;
      tbody.appendChild(tr);
    });
  }catch(e){ console.error(e); vazio.classList.remove('hidden'); }
}

window.addEventListener('DOMContentLoaded', async ()=>{
  await carregarUsuario();
  carregarPedidos();
});
