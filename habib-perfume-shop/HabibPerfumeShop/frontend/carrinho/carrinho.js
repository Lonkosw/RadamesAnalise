/**
 * Carrinho de Compras - Frontend
 * Armazenamento: sessionStorage 'carrinho' (compatível com menu.html)
 * Estrutura: { id, nome, preco, quantidade } ou { id_produto, nome_produto, preco_unitario, quantidade }
 */
(function(){
  const API = 'http://localhost:3001/pedido';
  const API_PRODUTO = 'http://localhost:3001/produto';
  const listaEl = document.getElementById('listaCarrinho');
  const resumoEl = document.getElementById('resumo');
  const feedbackEl = document.getElementById('feedback');
  const btnFinalizar = document.getElementById('btnFinalizar');
  const qtdItensEl = document.getElementById('qtdItens');
  const subtotalEl = document.getElementById('subtotal');
  const totalValorEl = document.getElementById('totalValor');
  
  // Cache de estoque dos produtos
  let estoqueProdutos = {};

  // ==================== STORAGE HELPERS ====================
  // Usa localStorage para persistir carrinho entre sessões
  function getCarrinho(){
    try {
      const data = localStorage.getItem('carrinho');
      if(!data) return [];
      return JSON.parse(data);
    } catch { return []; }
  }

  function setCarrinho(items){
    localStorage.setItem('carrinho', JSON.stringify(items));
  }
  
  // Normaliza item para formato padronizado (aceita ambos os formatos)
  function normalizeItem(item) {
    return {
      id_produto: item.id_produto || item.id,
      nome_produto: item.nome_produto || item.nome,
      preco_unitario: Number(item.preco_unitario || item.preco || 0),
      marca: item.marca || '',
      quantidade: item.quantidade || 1
    };
  }

  // ==================== ESTOQUE ====================
  async function carregarEstoque() {
    try {
      const res = await fetch(API_PRODUTO);
      if (res.ok) {
        const produtos = await res.json();
        produtos.forEach(p => {
          estoqueProdutos[p.id_produto] = p.quantidade_estoque || 0;
        });
      }
    } catch (e) {
      console.error('Erro ao carregar estoque:', e);
    }
  }

  // ==================== RENDER ====================
  function formatPrice(v){
    return 'R$ ' + Number(v||0).toFixed(2).replace('.', ',');
  }

  async function renderCarrinho(){
    // Carregar estoque antes de renderizar
    await carregarEstoque();
    
    const rawItems = getCarrinho();
    // Normaliza todos os itens
    const items = rawItems.map(normalizeItem);
    
    if(items.length === 0){
      listaEl.innerHTML = `
        <div class="carrinho-vazio">
          <h2>Seu carrinho está vazio</h2>
          <p>Adicione produtos para continuar</p>
          <a href="/menu" class="btn-continuar" style="display:inline-block;margin-top:20px;background:#23518a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Ver Produtos</a>
        </div>
      `;
      resumoEl.hidden = true;
      return;
    }

    let html = '';
    let total = 0;
    let qtdTotal = 0;

    items.forEach((item, idx) => {
      const subtotal = item.quantidade * item.preco_unitario;
      total += subtotal;
      qtdTotal += item.quantidade;
      
      html += `
        <div class="carrinho-item" data-idx="${idx}">
          <img src="/view-image/${item.id_produto}" alt="${item.nome_produto}" onerror="this.src='/imagens-produtos/default.png'">
          <div class="info">
            <h3>${item.nome_produto}</h3>
            <p>${item.marca ? `<span class="item-marca">🏷️ ${item.marca}</span> • ` : ''}${formatPrice(item.preco_unitario)} cada</p>
          </div>
          <div class="quantidade">
            <button class="btn-menos" data-idx="${idx}">−</button>
            <span>${item.quantidade}</span>
            <button class="btn-mais" data-idx="${idx}">+</button>
          </div>
          <div class="preco">${formatPrice(subtotal)}</div>
          <button class="remover" data-idx="${idx}">Remover</button>
        </div>
      `;
    });

    listaEl.innerHTML = html;
    resumoEl.hidden = false;
    qtdItensEl.textContent = qtdTotal;
    subtotalEl.textContent = formatPrice(total);
    totalValorEl.textContent = formatPrice(total);

    // Eventos
    listaEl.querySelectorAll('.btn-menos').forEach(btn => {
      btn.onclick = () => alterarQuantidade(+btn.dataset.idx, -1);
    });
    listaEl.querySelectorAll('.btn-mais').forEach(btn => {
      btn.onclick = () => alterarQuantidade(+btn.dataset.idx, 1);
    });
    listaEl.querySelectorAll('.remover').forEach(btn => {
      btn.onclick = () => removerItem(+btn.dataset.idx);
    });
  }

  // ==================== ACTIONS ====================
  function alterarQuantidade(idx, delta){
    const rawItems = getCarrinho();
    const items = rawItems.map(normalizeItem);
    if(!items[idx]) return;
    
    const novaQuantidade = items[idx].quantidade + delta;
    
    // Se está aumentando, verificar estoque
    if (delta > 0) {
      const idProduto = items[idx].id_produto;
      const estoqueDisponivel = estoqueProdutos[idProduto] || 0;
      
      if (novaQuantidade > estoqueDisponivel) {
        showFeedback(`⚠️ Estoque insuficiente! Disponível: ${estoqueDisponivel} unidade(s)`, false);
        return;
      }
    }
    
    rawItems[idx].quantidade = novaQuantidade;
    if(rawItems[idx].quantidade <= 0){
      rawItems.splice(idx, 1);
    }
    setCarrinho(rawItems);
    renderCarrinho();
    atualizarBadge();
  }

  function removerItem(idx){
    const items = getCarrinho();
    items.splice(idx, 1);
    setCarrinho(items);
    renderCarrinho();
    atualizarBadge();
    showFeedback('Item removido', true);
  }

  async function finalizarCompra(){
    const rawItems = getCarrinho();
    if(rawItems.length === 0){
      showFeedback('Carrinho vazio', false);
      return;
    }

    // Redireciona para página de finalização (igual ao fluxo do cliente)
    // A página de finalização cria o pedido e redireciona para pagamento
    window.location.href = '../visaoCliente/finalizar/finalizar.html';
  }

  // ==================== HELPERS ====================
  function showFeedback(msg, ok){
    feedbackEl.textContent = msg;
    feedbackEl.className = 'feedback ' + (ok ? 'ok' : 'error');
    feedbackEl.hidden = false;
    setTimeout(() => { feedbackEl.hidden = true; }, 4000);
  }

  function atualizarBadge(){
    // Atualizar badge no header se existir (tenta ambos os IDs)
    const badge = document.getElementById('cart-badge') || document.getElementById('carrinho-badge');
    const items = getCarrinho();
    const qtd = items.reduce((acc, i) => acc + (i.quantidade || 1), 0);
    
    if(badge){
      badge.textContent = qtd;
      badge.style.display = qtd > 0 ? 'inline-block' : 'none';
    }
    
    // Dispara evento global para outras partes da página saberem que o carrinho mudou
    window.dispatchEvent(new CustomEvent('carrinhoAtualizado', { detail: { quantidade: qtd, itens: items } }));
  }

  // ==================== INIT ====================
  btnFinalizar.addEventListener('click', finalizarCompra);
  document.addEventListener('DOMContentLoaded', () => {
    renderCarrinho();
    atualizarBadge();
  });

  // Expor função globalmente para uso em outros scripts
  window.CarrinhoUtils = {
    getCarrinho: getCarrinho,
    setCarrinho: setCarrinho,
    adicionar: function(produto){
      const items = getCarrinho();
      const idProduto = produto.id_produto || produto.id;
      const idx = items.findIndex(i => (i.id_produto || i.id) === idProduto);
      if(idx >= 0){
        items[idx].quantidade += produto.quantidade || 1;
      } else {
        items.push({
          id: idProduto,
          nome: produto.nome_produto || produto.nome,
          preco: Number(produto.preco_unitario || produto.preco || 0),
          quantidade: produto.quantidade || 1
        });
      }
      setCarrinho(items);
      atualizarBadge();
      return items;
    },
    getQtdTotal: function(){
      return getCarrinho().reduce((acc, i) => acc + (i.quantidade || 1), 0);
    }
  };
})();
