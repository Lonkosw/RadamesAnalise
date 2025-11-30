/**
 * Carrinho de Compras - Frontend
 * Armazenamento: Cookie 'carrinho' (JSON array de { id_produto, quantidade, preco_unitario, nome_produto })
 * Integração: Backend /pedido/carrinho/* para persistência e finalização
 */
(function(){
  const API = 'http://localhost:3001/pedido';
  const listaEl = document.getElementById('listaCarrinho');
  const resumoEl = document.getElementById('resumo');
  const feedbackEl = document.getElementById('feedback');
  const btnFinalizar = document.getElementById('btnFinalizar');
  const qtdItensEl = document.getElementById('qtdItens');
  const subtotalEl = document.getElementById('subtotal');
  const totalValorEl = document.getElementById('totalValor');

  // ==================== COOKIE HELPERS ====================
  function getCarrinhoCookie(){
    const match = document.cookie.match(/(?:^|;\s*)carrinho=([^;]*)/);
    if(!match) return [];
    try { return JSON.parse(decodeURIComponent(match[1])); } catch { return []; }
  }

  function setCarrinhoCookie(items){
    const val = encodeURIComponent(JSON.stringify(items));
    document.cookie = `carrinho=${val}; path=/; max-age=${60*60*24*7}`; // 7 dias
  }

  // ==================== RENDER ====================
  function formatPrice(v){
    return 'R$ ' + Number(v||0).toFixed(2).replace('.', ',');
  }

  function renderCarrinho(){
    const items = getCarrinhoCookie();
    
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
          <img src="/imagens-produtos/${item.id_produto}.png" alt="${item.nome_produto}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2212%22>Sem img</text></svg>'">
          <div class="info">
            <h3>${item.nome_produto}</h3>
            <p>${formatPrice(item.preco_unitario)} cada</p>
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
    const items = getCarrinhoCookie();
    if(!items[idx]) return;
    items[idx].quantidade += delta;
    if(items[idx].quantidade <= 0){
      items.splice(idx, 1);
    }
    setCarrinhoCookie(items);
    renderCarrinho();
    atualizarBadge();
  }

  function removerItem(idx){
    const items = getCarrinhoCookie();
    items.splice(idx, 1);
    setCarrinhoCookie(items);
    renderCarrinho();
    atualizarBadge();
    showFeedback('Item removido', true);
  }

  async function finalizarCompra(){
    const items = getCarrinhoCookie();
    if(items.length === 0){
      showFeedback('Carrinho vazio', false);
      return;
    }

    btnFinalizar.disabled = true;
    btnFinalizar.textContent = 'Processando...';

    try {
      const res = await fetch(`${API}/carrinho/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itens: items })
      });

      const data = await res.json();
      
      if(!res.ok){
        throw new Error(data.error || 'Erro ao finalizar');
      }

      // Limpar carrinho
      setCarrinhoCookie([]);
      atualizarBadge();
      
      // Mostrar sucesso
      listaEl.innerHTML = `
        <div class="carrinho-vazio" style="color:#1a6b2d;">
          <h2>✓ Compra realizada com sucesso!</h2>
          <p>Pedido #${data.id_pedido} criado</p>
          <p style="margin-top:10px;">Total: ${formatPrice(data.total)}</p>
          <a href="/menu" class="btn-continuar" style="display:inline-block;margin-top:20px;background:#1a6b2d;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Voltar às Compras</a>
        </div>
      `;
      resumoEl.hidden = true;

    } catch(err){
      showFeedback(err.message, false);
      btnFinalizar.disabled = false;
      btnFinalizar.textContent = 'Finalizar Compra';
    }
  }

  // ==================== HELPERS ====================
  function showFeedback(msg, ok){
    feedbackEl.textContent = msg;
    feedbackEl.className = 'feedback ' + (ok ? 'ok' : 'error');
    feedbackEl.hidden = false;
    setTimeout(() => { feedbackEl.hidden = true; }, 4000);
  }

  function atualizarBadge(){
    // Atualizar badge no header se existir
    const badge = document.getElementById('carrinho-badge');
    if(badge){
      const items = getCarrinhoCookie();
      const qtd = items.reduce((acc, i) => acc + i.quantidade, 0);
      badge.textContent = qtd;
      badge.style.display = qtd > 0 ? 'inline-block' : 'none';
    }
  }

  // ==================== INIT ====================
  btnFinalizar.addEventListener('click', finalizarCompra);
  document.addEventListener('DOMContentLoaded', () => {
    renderCarrinho();
    atualizarBadge();
  });

  // Expor função globalmente para uso em outros scripts
  window.CarrinhoUtils = {
    getCarrinho: getCarrinhoCookie,
    setCarrinho: setCarrinhoCookie,
    adicionar: function(produto){
      const items = getCarrinhoCookie();
      const idx = items.findIndex(i => i.id_produto === produto.id_produto);
      if(idx >= 0){
        items[idx].quantidade += produto.quantidade || 1;
      } else {
        items.push({
          id_produto: produto.id_produto,
          nome_produto: produto.nome_produto,
          preco_unitario: produto.preco_unitario,
          quantidade: produto.quantidade || 1
        });
      }
      setCarrinhoCookie(items);
      atualizarBadge();
      return items;
    },
    getQtdTotal: function(){
      return getCarrinhoCookie().reduce((acc, i) => acc + i.quantidade, 0);
    }
  };
})();
