import { buildTable, fillForm, serialize, clear, feedback } from '../common/crud.js';

const API = 'http://localhost:3001/produto';
const lista = document.getElementById('lista');
const form = document.getElementById('formProduto');
const fb = document.getElementById('fb');
const totalBadge = document.getElementById('totalBadge');
const inpImagem = document.getElementById('inpImagem');
const previewImg = document.getElementById('previewImg');
const secForm = document.getElementById('secForm');

let cache = [];
let editingId = null;

// Logout global
window.logout = function() {
  document.cookie = 'usuarioLogado=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  window.location.href = '/login/login.html';
};

async function diagnosticoInicial(){
  try {
    const r = await fetch(`${API}/ping`, { credentials:'include' });
    if(!r.ok){
      feedback(fb, 'Rota /produto indisponível (ping falhou)', false);
      return false;
    }
    return true;
  } catch(err){
    feedback(fb, 'Falha de rede ao acessar /produto (ping)', false);
    return false;
  }
}

async function carregar(){
  // garante que rota básica responde antes de tentar listar
  const ok = await diagnosticoInicial();
  if(!ok){ cache=[]; render(); return; }
  const params = new URLSearchParams();
  const fBusca = document.getElementById('fBusca');
  const fMin = document.getElementById('fMin');
  const fMax = document.getElementById('fMax');
  const q = fBusca?.value?.trim(); if(q) params.append('q', q);
  const min = fMin?.value?.trim(); if(min) params.append('min_preco', min);
  const max = fMax?.value?.trim(); if(max) params.append('max_preco', max);
  const url = params.toString()? `${API}?${params.toString()}` : API;
  try{
    const r = await fetch(url, { credentials:'include' });
    if(!r.ok){
      let msg = `Falha ao carregar produtos (status ${r.status})`;
      try{ const err = await r.json(); msg = err.message||err.error||msg; }catch{}
      feedback(fb, msg, false);
      cache = [];
    }else{
      const data = await r.json();
      cache = Array.isArray(data) ? data : [];
    }
    totalBadge.textContent = (cache||[]).length + ' produtos';
    render();
  }catch(e){
    feedback(fb, 'Erro de rede ao carregar', false);
    cache = []; render();
  }
}

function render(){
  // Renderiza como cards em vez de tabela
  lista.innerHTML = '';
  
  if(!cache || cache.length === 0) {
    lista.innerHTML = '<p class="text-muted text-center" style="grid-column:1/-1;padding:40px;">Nenhum produto encontrado</p>';
    return;
  }
  
  cache.forEach(row => {
    const card = document.createElement('div');
    card.className = 'produto-item';
    const preco = Number(row.preco_produto || 0).toFixed(2).replace('.', ',');
    const estoque = row.quantidade_estoque || 0;
    const estoqueClass = estoque > 10 ? 'text-success' : estoque > 0 ? 'text-warning' : 'text-danger';
    
    card.innerHTML = `
      <img src="/imagens-produtos/${row.id_produto}.png" alt="${row.nome_produto || ''}" class="produto-item-img" onerror="this.src='/imagens-produtos/default.png'">
      <div class="produto-item-info">
        <h3 class="produto-item-nome">${row.nome_produto || 'Sem nome'}</h3>
        <p class="produto-item-meta">${[row.marca_produto, row.concentracao].filter(Boolean).join(' • ') || '-'}</p>
        <div class="produto-item-preco">R$ ${preco}</div>
        <p class="produto-item-estoque ${estoqueClass}">Estoque: ${estoque} unidades</p>
        <div class="produto-item-acoes">
          <button class="btn btn-sm btn-warning btn-editar">✏️ Editar</button>
          <button class="btn btn-sm btn-danger btn-excluir">🗑️</button>
        </div>
      </div>
    `;
    
    card.querySelector('.btn-editar').addEventListener('click', () => {
      editingId = row.id_produto;
      const adapt = mapRow(row);
      fillForm(form, adapt);
      carregarImagemExistente(editingId);
      document.getElementById('tituloForm').textContent = 'Editar Produto';
      document.getElementById('btnExcluir').hidden = false;
      secForm?.classList.remove('hidden');
      window.scrollTo({top: secForm?.offsetTop || 0, behavior:'smooth'});
    });
    
    card.querySelector('.btn-excluir').addEventListener('click', () => {
      if(confirm('Remover produto ' + (row.nome_produto || '') + '?')) {
        remover(row.id_produto);
      }
    });
    
    lista.appendChild(card);
  });
}

function mapRow(r){
  return {
    id_produto: r.id_produto,
    nome: r.nome_produto,
    marca: r.marca_produto,
    volume_ml: r.volume_ml,
    concentracao: r.concentracao,
    preco: r.preco_produto,
    quantidade_estoque: r.quantidade_estoque,
    descricao: r.descricao_produto
  };
}

async function remover(id){
  try{
    const r = await fetch(`${API}/${id}`, {method:'DELETE', credentials:'include'});
    if(!r.ok) {
      let msg = 'Falha ao remover';
      try {
        const data = await r.json();
        msg = data.error || data.message || msg;
      } catch(e) {}
      throw new Error(msg);
    }
    feedback(fb,'Produto removido com sucesso!',true); 
    await carregar(); 
    clear(form); 
    editingId=null; 
    resetPreview();
    secForm?.classList.add('hidden');
    document.getElementById('btnExcluir').hidden = true;
  }catch(e){ 
    feedback(fb, e.message, false); 
    alert('Erro ao remover: ' + e.message);
  }
}

form.addEventListener('submit', async e=>{
  e.preventDefault();
  const dados = serialize(form);
  if(!dados.nome || dados.preco===undefined || dados.preco==='' || dados.quantidade_estoque===undefined || dados.quantidade_estoque===''){ return feedback(fb,'Campos obrigatórios faltando',false); }
  // normalizações como funcionario.js
  const precoNorm = String(dados.preco).replace(',', '.').trim();
  const qtdNorm = String(dados.quantidade_estoque).trim();
  if(isNaN(Number(precoNorm))) return feedback(fb,'Preço inválido',false);
  if(isNaN(Number(qtdNorm)) || !Number.isInteger(Number(qtdNorm)) || Number(qtdNorm)<0) return feedback(fb,'Quantidade inválida',false);
  const payload = {
    nome: dados.nome,
    marca: dados.marca||null,
    volume_ml: dados.volume_ml||null,
    concentracao: dados.concentracao||null,
    descricao: dados.descricao||null,
    preco: precoNorm,
    quantidade_estoque: qtdNorm
  };
  const method = editingId? 'PUT':'POST';
  const url = editingId? `${API}/${editingId}`: API;
  try{
    const r = await fetch(url, {method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), credentials:'include'});
    const data = await r.json();
    if(!r.ok) throw new Error(data.error||'Erro');
    const nova = !editingId;
    editingId = data.id_produto; feedback(fb,'Salvo',true); await carregar();
    if(nova){ // upload automático se imagem já selecionada
      const f = inpImagem.files && inpImagem.files[0]; if(f){ await enviarImagem(editingId, f); }
    }
  }catch(err){ feedback(fb, `Erro salvar: ${err.message}`, false); }
});

btnFiltrar.addEventListener('click', carregar);
btnLimpar.addEventListener('click', ()=>{ 
  document.getElementById('fBusca').value=''; 
  document.getElementById('fMin').value=''; 
  document.getElementById('fMax').value=''; 
  carregar(); 
});
btnNovo.addEventListener('click', ()=>{ 
  editingId=null; 
  clear(form); 
  feedback(fb,'',true); 
  document.querySelector('[name="id_produto"]').value=''; 
  resetPreview(); 
  document.getElementById('tituloForm').textContent = 'Novo Produto';
  secForm?.classList.remove('hidden');
  window.scrollTo({top:secForm?.offsetTop || 0, behavior:'smooth'}); 
});

// Cancelar
document.getElementById('btnCancelar')?.addEventListener('click', () => {
  secForm?.classList.add('hidden');
  editingId = null;
  clear(form);
  resetPreview();
});

// Excluir
document.getElementById('btnExcluir')?.addEventListener('click', () => {
  if(editingId && confirm('Remover este produto?')) {
    remover(editingId);
  }
});

inpImagem?.addEventListener('change', async ()=>{
  const f = inpImagem.files && inpImagem.files[0];
  if(!f){ resetPreview(); return; }
  const url = URL.createObjectURL(f);
  previewImg.src = url; previewImg.parentElement.classList.add('has-image');
  if(editingId){ await enviarImagem(editingId, f); }
});

async function enviarImagem(id, file){
  if(!file) return;
  if(file.type!=='image/png'){ return feedback(fb,'Apenas PNG suportado',false); }
  const fd = new FormData(); fd.append('imageFile', file); fd.append('produtoId', id); fd.append('imageSource','local');
  try{
    const r = await fetch('http://localhost:3001/upload-image', {method:'POST', body:fd, credentials:'include'});
    const data = await r.json();
    if(!r.ok) throw new Error(data.message||'Falha upload');
    feedback(fb,'Imagem salva',true);
    previewImg.src = `/imagens-produtos/${id}.png?t=${Date.now()}`;
  }catch(e){ feedback(fb, e.message, false); }
}

function resetPreview(){ previewImg.removeAttribute('src'); previewImg.parentElement.classList.remove('has-image'); }

async function carregarImagemExistente(id){
  if(!id){ resetPreview(); return; }
  previewImg.src = `/imagens-produtos/${id}.png?t=${Date.now()}`;
  previewImg.parentElement.classList.add('has-image');
}

document.addEventListener('DOMContentLoaded', carregar);
