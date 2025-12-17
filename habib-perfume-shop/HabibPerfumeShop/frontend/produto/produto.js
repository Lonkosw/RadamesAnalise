import { buildTable, fillForm, serialize, clear, feedback } from '../common/crud.js';

const API = 'http://localhost:3001/produto';
const API_MARCA = 'http://localhost:3001/marca';
const lista = document.getElementById('lista');
const form = document.getElementById('formProduto');
const fb = document.getElementById('fb');
const totalBadge = document.getElementById('totalBadge');
const inpImagem = document.getElementById('inpImagem');
const previewImg = document.getElementById('previewImg');
const secForm = document.getElementById('secForm');
const selectMarca = document.getElementById('marca_id_marca');

// Notas Olfativas - elementos
const inpNotas = document.getElementById('inpNotas');
const previewNotas = document.getElementById('previewNotas');
const btnVerNotas = document.getElementById('btnVerNotas');
const modalNotasOverlay = document.getElementById('modalNotasOverlay');
const modalNotasClose = document.getElementById('modalNotasClose');
const modalNotasTitle = document.getElementById('modalNotasTitle');
const modalNotasImg = document.getElementById('modalNotasImg');

let cache = [];
let cacheMarcas = [];
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

// Carregar marcas para o select
async function carregarMarcas() {
  try {
    const r = await fetch(API_MARCA, { credentials: 'include' });
    if (!r.ok) return;
    cacheMarcas = await r.json();
    
    if (selectMarca) {
      selectMarca.innerHTML = '<option value="">-- Selecione uma marca --</option>';
      cacheMarcas.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id_marca;
        opt.textContent = m.nome_marca;
        selectMarca.appendChild(opt);
      });
    }
  } catch (e) {
    console.error('Erro ao carregar marcas:', e);
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
    
    // Mostrar nome da marca cadastrada ou marca texto livre
    const nomeMarca = row.nome_marca || row.marca_produto || '';
    
    // Usar view-image para buscar imagem dinamicamente
    const imgSrc = `/view-image/${row.id_produto}?t=${Date.now()}`;
    
    card.innerHTML = `
      <img src="${imgSrc}" alt="${row.nome_produto || ''}" class="produto-item-img" onerror="this.src='/imagens-produtos/default.png'">
      <div class="produto-item-info">
        <h3 class="produto-item-nome">${row.nome_produto || 'Sem nome'}</h3>
        <p class="produto-item-meta">${[nomeMarca, row.concentracao].filter(Boolean).join(' • ') || '-'}</p>
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
      carregarNotasExistente(editingId, row.notas_olfativas_imagem);
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
    descricao: r.descricao_produto,
    marca_id_marca: r.marca_id_marca || ''
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
    resetPreviewNotas();
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
    quantidade_estoque: qtdNorm,
    marca_id_marca: dados.marca_id_marca || null
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
      const fn = inpNotas?.files && inpNotas.files[0]; if(fn){ await enviarNotasOlfativas(editingId, fn); }
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
  resetPreviewNotas();
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
  resetPreviewNotas();
});

// Excluir
document.getElementById('btnExcluir')?.addEventListener('click', () => {
  if(editingId && confirm('Remover este produto?')) {
    remover(editingId);
  }
});

// Constantes de validação de imagem
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

inpImagem?.addEventListener('change', async ()=>{
  const f = inpImagem.files && inpImagem.files[0];
  if(!f){ resetPreview(); return; }
  
  // Validar tipo
  if(!ALLOWED_TYPES.includes(f.type)){
    feedback(fb, 'Formato não suportado. Use: PNG, JPG ou WEBP', false);
    inpImagem.value = '';
    resetPreview();
    return;
  }
  
  // Validar tamanho
  if(f.size > MAX_IMAGE_SIZE){
    feedback(fb, `Arquivo muito grande. Máximo: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`, false);
    inpImagem.value = '';
    resetPreview();
    return;
  }
  
  const url = URL.createObjectURL(f);
  previewImg.src = url; 
  previewImg.parentElement.classList.add('has-image');
  
  // Upload automático se estiver editando
  if(editingId){ 
    await enviarImagem(editingId, f); 
  }
});

async function enviarImagem(id, file){
  if(!file) return;
  
  // Validação no frontend
  if(!ALLOWED_TYPES.includes(file.type)){
    return feedback(fb, 'Formato não suportado. Use: PNG, JPG ou WEBP', false);
  }
  if(file.size > MAX_IMAGE_SIZE){
    return feedback(fb, `Arquivo muito grande. Máximo: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`, false);
  }
  
  const fd = new FormData(); 
  fd.append('imageFile', file); 
  fd.append('produtoId', id); 
  fd.append('imageSource', 'local');
  
  try{
    feedback(fb, 'Enviando imagem...', true);
    const r = await fetch('http://localhost:3001/upload-image', {method:'POST', body:fd, credentials:'include'});
    const data = await r.json();
    if(!r.ok) throw new Error(data.message || 'Falha no upload');
    feedback(fb, '✅ Imagem salva com sucesso!', true);
    
    // Atualizar preview com o novo caminho
    if(data.path){
      previewImg.src = data.path + `?t=${Date.now()}`;
    } else {
      previewImg.src = `/view-image/${id}?t=${Date.now()}`;
    }
  }catch(e){ 
    feedback(fb, '❌ ' + e.message, false); 
  }
}

function resetPreview(){ 
  previewImg.removeAttribute('src'); 
  previewImg.parentElement.classList.remove('has-image'); 
}

async function carregarImagemExistente(id){
  if(!id){ resetPreview(); return; }
  // Usar a rota view-image que busca no banco
  previewImg.src = `/view-image/${id}?t=${Date.now()}`;
  previewImg.onerror = () => {
    // Fallback para imagem padrão se não encontrar
    previewImg.src = '/imagens-produtos/default.png';
    previewImg.onerror = null;
  };
  previewImg.parentElement.classList.add('has-image');
}

// =====================================================
// NOTAS OLFATIVAS - FUNÇÕES
// =====================================================

function resetPreviewNotas(){
  if(previewNotas) {
    previewNotas.removeAttribute('src');
    previewNotas.parentElement?.classList.remove('has-image');
  }
  if(btnVerNotas) btnVerNotas.hidden = true;
  if(inpNotas) inpNotas.value = '';
}

async function carregarNotasExistente(id, notasPath){
  if(!id){ resetPreviewNotas(); return; }
  
  // Tentar buscar via rota view-notas
  const src = `/view-notas/${id}?t=${Date.now()}`;
  
  if(previewNotas) {
    previewNotas.src = src;
    previewNotas.onerror = () => {
      // Se não encontrar, apenas reseta
      previewNotas.removeAttribute('src');
      previewNotas.parentElement?.classList.remove('has-image');
      if(btnVerNotas) btnVerNotas.hidden = true;
      previewNotas.onerror = null;
    };
    previewNotas.onload = () => {
      previewNotas.parentElement?.classList.add('has-image');
      if(btnVerNotas) btnVerNotas.hidden = false;
    };
  }
}

// Event listener para input de notas
inpNotas?.addEventListener('change', async () => {
  const f = inpNotas.files && inpNotas.files[0];
  if(!f){ resetPreviewNotas(); return; }
  
  // Validar tipo
  if(!ALLOWED_TYPES.includes(f.type)){
    feedback(fb, 'Formato não suportado para notas. Use: PNG, JPG ou WEBP', false);
    inpNotas.value = '';
    resetPreviewNotas();
    return;
  }
  
  // Validar tamanho
  if(f.size > MAX_IMAGE_SIZE){
    feedback(fb, `Arquivo de notas muito grande. Máximo: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`, false);
    inpNotas.value = '';
    resetPreviewNotas();
    return;
  }
  
  const url = URL.createObjectURL(f);
  if(previewNotas) {
    previewNotas.src = url;
    previewNotas.parentElement?.classList.add('has-image');
  }
  
  // Upload automático se estiver editando
  if(editingId){ 
    await enviarNotasOlfativas(editingId, f); 
  }
});

async function enviarNotasOlfativas(id, file){
  if(!file) return;
  
  // Validação no frontend
  if(!ALLOWED_TYPES.includes(file.type)){
    return feedback(fb, 'Formato não suportado para notas. Use: PNG, JPG ou WEBP', false);
  }
  if(file.size > MAX_IMAGE_SIZE){
    return feedback(fb, `Arquivo muito grande. Máximo: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`, false);
  }
  
  const fd = new FormData(); 
  fd.append('imageFile', file); 
  fd.append('produtoId', id); 
  fd.append('imageSource', 'local');
  
  try{
    feedback(fb, 'Enviando imagem de notas olfativas...', true);
    const r = await fetch('http://localhost:3001/upload-notas', {method:'POST', body:fd, credentials:'include'});
    const data = await r.json();
    if(!r.ok) throw new Error(data.message || 'Falha no upload de notas');
    feedback(fb, '✅ Notas olfativas salvas com sucesso!', true);
    
    // Atualizar preview
    if(previewNotas) {
      previewNotas.src = `/view-notas/${id}?t=${Date.now()}`;
      previewNotas.parentElement?.classList.add('has-image');
    }
    if(btnVerNotas) btnVerNotas.hidden = false;
  }catch(e){ 
    feedback(fb, '❌ ' + e.message, false); 
  }
}

// =====================================================
// MODAL MINIMALISTA - NOTAS OLFATIVAS
// =====================================================

function abrirModalNotas(){
  if(!editingId) return;
  
  // Encontrar o produto no cache para pegar o nome
  const produto = cache.find(p => p.id_produto === editingId);
  const nome = produto?.nome_produto || 'Produto';
  
  if(modalNotasTitle) modalNotasTitle.textContent = `Notas Olfativas – ${nome}`;
  if(modalNotasImg) {
    modalNotasImg.src = `/view-notas/${editingId}?t=${Date.now()}`;
    modalNotasImg.alt = `Notas Olfativas de ${nome}`;
  }
  if(modalNotasOverlay) modalNotasOverlay.classList.add('active');
  
  // Previne scroll do body
  document.body.style.overflow = 'hidden';
}

function fecharModalNotas(){
  if(modalNotasOverlay) modalNotasOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Event listeners do modal
btnVerNotas?.addEventListener('click', abrirModalNotas);
modalNotasClose?.addEventListener('click', fecharModalNotas);
modalNotasOverlay?.addEventListener('click', (e) => {
  if(e.target === modalNotasOverlay) fecharModalNotas();
});

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && modalNotasOverlay?.classList.contains('active')){
    fecharModalNotas();
  }
});

// Expor função para uso global (vitrine do cliente)
window.abrirModalNotasById = async function(produtoId, nomeProduto){
  if(modalNotasTitle) modalNotasTitle.textContent = `🔮 Notas Olfativas - ${nomeProduto || 'Produto'}`;
  if(modalNotasImg) {
    modalNotasImg.src = `/view-notas/${produtoId}?t=${Date.now()}`;
    modalNotasImg.alt = `Notas Olfativas de ${nomeProduto}`;
  }
  if(modalNotasOverlay) modalNotasOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
};

document.addEventListener('DOMContentLoaded', async () => {
  await carregarMarcas();
  await carregar();
});
