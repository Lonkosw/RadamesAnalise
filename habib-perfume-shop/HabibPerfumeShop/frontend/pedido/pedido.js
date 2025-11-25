const API_BASE = 'http://localhost:3001';
let _usuario = null;

function qs(id){ return document.getElementById(id); }
function fmtMoeda(v){ return 'R$ ' + Number(v||0).toFixed(2).replace('.',','); }
function toast(msg){
  let box = document.getElementById('toast-box');
  if(!box){ box = document.createElement('div'); box.id='toast-box'; document.body.appendChild(box);}  
  const el = document.createElement('div'); el.className='toast'; el.textContent=msg; box.appendChild(el);
  setTimeout(()=> el.classList.add('show'),10);
  setTimeout(()=> { el.classList.remove('show'); setTimeout(()=> el.remove(),300); },2500);
}

async function carregarUsuario(){
  try{
    const r = await fetch(API_BASE + '/login/status',{credentials:'include'});
    const data = await r.json();
    if(data.status==='ok') { _usuario = data.usuario; return; }
  }catch(e){ console.error(e); }
  window.location.href = '/login/login.html';
}

function obterIdPedido(){
  const url = new URL(window.location.href);
  return parseInt(url.searchParams.get('id'),10) || null;
}

async function carregarPedido(id){
  try{
    const r = await fetch(`${API_BASE}/pedido/${id}`, {credentials:'include'});
    if(!r.ok){
      const data = await r.json().catch(()=>({}));
      throw new Error(data.error || 'Erro ao obter pedido');
    }
    const data = await r.json();
    preencherPedido(data);
  }catch(e){
    console.error(e);
    qs('loading').classList.add('hidden');
    const er = qs('erro');
    er.textContent = e.message;
    er.classList.remove('hidden');
  }
}

let _pedidoDados = null; // cache para polling
let _pollTimer = null;

function preencherPedido(data){
  _pedidoDados = data;
  const { pedido, itens, pagamento_pix } = data;
  qs('pedidoId').textContent = '#' + pedido.id_pedido;
  qs('pedidoStatus').textContent = pedido.status || '—';
  qs('pedidoStatus').className = 'badge status-'+(pedido.status||'').replace(/[^A-Z_]/g,'');
  qs('pedidoData').textContent = new Date(pedido.data_pedido).toLocaleString();
  qs('pedidoTotal').textContent = fmtMoeda(pedido.total || 0);
  qs('pedidoCliente').textContent = pedido.cliente_cpf;
  const tbody = qs('listaItens');
  tbody.innerHTML='';
  (itens||[]).forEach(it=>{
    const tr = document.createElement('tr');
    const subtotal = Number(it.preco_unitario||0)*it.quantidade;
    tr.innerHTML = `<td>${it.id_item}</td><td>${it.perfume_nome||''}</td><td class="num">${it.quantidade}</td><td class="num">${fmtMoeda(it.preco_unitario)}</td><td class="num">${fmtMoeda(subtotal)}</td>`;
    tbody.appendChild(tr);
  });
  // Exibe info Pix se existir
  const secPix = qs('secPagamentoPix');
  if(pagamento_pix){
    secPix.classList.remove('hidden');
    qs('pixPayload').textContent = pagamento_pix.qr_code_text || '';
    qs('pixStatus').textContent = pagamento_pix.status_pix || '—';
    qs('pixStatus').className = 'badge status-'+(pagamento_pix.status_pix||'').replace(/[^A-Z_]/g,'');
  } else {
    secPix.classList.add('hidden');
  }
  qs('loading').classList.add('hidden');
  qs('pedidoView').classList.remove('hidden');
  montarAcoes(pedido);
  configurarPolling();
}

function montarAcoes(pedido){
  const area = document.getElementById('areaPagamento');
  area.innerHTML='';
  if(pedido.status==='AGUARDANDO_PAGAMENTO'){
    const btnPagar = document.createElement('button');
    btnPagar.className='btn';
    btnPagar.textContent='Simular Pagamento';
    btnPagar.addEventListener('click', ()=> simularPagamento(pedido.id_pedido, btnPagar));
    area.appendChild(btnPagar);
  }
}

function configurarPolling(){
  if(_pollTimer) clearTimeout(_pollTimer);
  if(!_pedidoDados) return;
  const { pedido } = _pedidoDados;
  if(pedido.status === 'AGUARDANDO_PAGAMENTO'){
    _pollTimer = setTimeout(async ()=>{
      try{
        const r = await fetch(`${API_BASE}/pedido/${pedido.id_pedido}`, {credentials:'include'});
        if(r.ok){
          const data = await r.json();
            // se mudou status ou pix
            const prevStatus = _pedidoDados.pedido.status;
            preencherPedido(data);
            if(prevStatus !== data.pedido.status && data.pedido.status === 'PAGO'){
              toast('Pagamento confirmado');
            }
        }
      }catch(_e){/* silencioso */}
    }, 5000);
  }
}

function copiarPix(){
  const payload = qs('pixPayload').textContent.trim();
  if(!payload){ toast('Nada para copiar'); return; }
  navigator.clipboard.writeText(payload).then(()=> toast('Código Pix copiado')); 
}

async function simularPagamento(id, btn){
  try{
    btn.disabled=true; btn.textContent='Processando...';
    const r = await fetch(`${API_BASE}/pagamento/simular/${id}`, {method:'POST', credentials:'include'});
    if(!r.ok){ const d = await r.json().catch(()=>({})); throw new Error(d.error||'Erro pagamento'); }
    const d = await r.json();
    toast('Pagamento registrado');
    // Atualiza cache e UI
    if(_pedidoDados){ _pedidoDados.pedido = d.pedido; }
    qs('pedidoStatus').textContent = d.pedido.status;
    qs('pedidoStatus').className = 'badge status-'+d.pedido.status;
    montarAcoes(d.pedido);
    // Atualiza seção Pix se veio info
    if(d.pagamento_pix){
      qs('secPagamentoPix').classList.remove('hidden');
      qs('pixPayload').textContent = d.pagamento_pix.qr_code_text || qs('pixPayload').textContent;
      qs('pixStatus').textContent = d.pagamento_pix.status_pix || 'PAGO';
      qs('pixStatus').className = 'badge status-'+(d.pagamento_pix.status_pix||'PAGO');
    } else if(_pedidoDados && _pedidoDados.pagamento_pix){
      // Ajusta status pix local se já existia
      _pedidoDados.pagamento_pix.status_pix = 'PAGO';
      qs('pixStatus').textContent = 'PAGO';
      qs('pixStatus').className = 'badge status-PAGO';
    }
  }catch(e){ console.error(e); toast(e.message); }
  finally{ btn.disabled=false; btn.textContent='Simular Pagamento'; }
}

window.addEventListener('DOMContentLoaded', async ()=>{
  await carregarUsuario();
  const id = obterIdPedido();
  if(!id){
    qs('loading').classList.add('hidden');
    const er = qs('erro');
    er.textContent='ID do pedido não informado';
    er.classList.remove('hidden');
    return;
  }
  carregarPedido(id);
  const btnCopiar = document.getElementById('btnCopiarPix');
  btnCopiar.addEventListener('click', copiarPix);
});