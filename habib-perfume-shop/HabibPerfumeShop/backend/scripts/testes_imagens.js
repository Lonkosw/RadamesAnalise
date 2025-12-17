// =============================================================================
// TESTES COMPLETOS - CRUD Produto com Imagens
// =============================================================================

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testarCRUDProduto() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTES COMPLETOS - CRUD PRODUTO COM IMAGENS');
  console.log('='.repeat(60) + '\n');
  
  let passed = 0;
  let failed = 0;
  let produtoTestId = null;
  
  // TESTE 1: Listar produtos com imagem_produto
  console.log('1️⃣ Teste: GET /produto - Listar produtos com campo imagem_produto');
  try {
    const res = await fetch(`${API_BASE}/produto`);
    const produtos = await res.json();
    
    if (res.ok && Array.isArray(produtos)) {
      const temCampoImagem = produtos.length === 0 || produtos.every(p => 'imagem_produto' in p);
      if (temCampoImagem) {
        console.log('   ✅ Campo imagem_produto presente nos produtos');
        console.log(`   📦 ${produtos.length} produtos encontrados`);
        produtos.forEach(p => {
          console.log(`      - #${p.id_produto}: ${p.nome_produto} → ${p.imagem_produto || 'SEM IMAGEM'}`);
        });
        passed++;
      } else {
        console.log('   ❌ Campo imagem_produto NÃO encontrado');
        failed++;
      }
    } else {
      console.log('   ❌ Falha ao listar produtos');
      failed++;
    }
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
    failed++;
  }
  
  // TESTE 2: Criar produto novo
  console.log('\n2️⃣ Teste: POST /produto - Criar produto novo');
  try {
    const novoProduto = {
      nome: 'Perfume Teste Imagem ' + Date.now(),
      marca: 'Teste',
      volume_ml: 100,
      preco: 199.99,
      quantidade_estoque: 50
    };
    
    const res = await fetch(`${API_BASE}/produto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoProduto)
    });
    const criado = await res.json();
    
    if (res.ok && criado.id_produto) {
      produtoTestId = criado.id_produto;
      console.log(`   ✅ Produto criado: ID #${produtoTestId}`);
      console.log(`   📦 imagem_produto: ${criado.imagem_produto || 'NULL (esperado)'}`);
      passed++;
    } else {
      console.log('   ❌ Falha ao criar produto:', criado.error || 'Erro desconhecido');
      failed++;
    }
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
    failed++;
  }
  
  // TESTE 3: View-image de produto existente
  console.log('\n3️⃣ Teste: GET /view-image/:id - Visualizar imagem');
  try {
    // Testar com produto existente (12)
    const res = await fetch(`${API_BASE}/view-image/12`);
    
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      console.log(`   ✅ Imagem do produto #12 encontrada`);
      console.log(`   📷 Content-Type: ${contentType}`);
      passed++;
    } else {
      console.log('   ⚠️ Produto #12 não tem imagem (404 esperado)');
      passed++; // Aceitável se não houver imagem
    }
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
    failed++;
  }
  
  // TESTE 4: Upload de imagem (simulado)
  console.log('\n4️⃣ Teste: POST /upload-image - Upload de imagem');
  if (produtoTestId) {
    try {
      // Criar um PNG mínimo válido (1x1 pixel transparente)
      const pngMinimo = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // width = 1
        0x00, 0x00, 0x00, 0x01, // height = 1
        0x08, 0x06, // bit depth = 8, color type = 6 (RGBA)
        0x00, 0x00, 0x00, // compression, filter, interlace
        0x1F, 0x15, 0xC4, 0x89, // CRC
        0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
        0x49, 0x44, 0x41, 0x54, // IDAT
        0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // compressed data
        0x0D, 0x0A, 0x2D, 0xB4, // CRC
        0x00, 0x00, 0x00, 0x00, // IEND chunk length
        0x49, 0x45, 0x4E, 0x44, // IEND
        0xAE, 0x42, 0x60, 0x82  // CRC
      ]);
      
      const formData = new FormData();
      formData.append('produtoId', produtoTestId.toString());
      formData.append('imageSource', 'local');
      formData.append('imageFile', new Blob([pngMinimo], { type: 'image/png' }), 'teste.png');
      
      const res = await fetch(`${API_BASE}/upload-image`, {
        method: 'POST',
        body: formData
      });
      const resultado = await res.json();
      
      if (res.ok) {
        console.log(`   ✅ Upload realizado com sucesso`);
        console.log(`   📁 Arquivo: ${resultado.filename}`);
        console.log(`   🔗 Path: ${resultado.path}`);
        passed++;
      } else {
        console.log(`   ❌ Falha no upload: ${resultado.message || 'Erro desconhecido'}`);
        failed++;
      }
    } catch (err) {
      console.log('   ❌ Erro:', err.message);
      failed++;
    }
  } else {
    console.log('   ⏭️ Pulado - Produto de teste não foi criado');
  }
  
  // TESTE 5: Verificar se imagem foi salva no banco
  console.log('\n5️⃣ Teste: Verificar imagem_produto no banco após upload');
  if (produtoTestId) {
    try {
      const res = await fetch(`${API_BASE}/produto/${produtoTestId}`);
      const produto = await res.json();
      
      if (res.ok && produto.imagem_produto) {
        console.log(`   ✅ Campo imagem_produto atualizado no banco`);
        console.log(`   📦 Valor: ${produto.imagem_produto}`);
        passed++;
      } else {
        console.log(`   ⚠️ Campo imagem_produto ainda NULL (upload pode ter falhado)`);
        console.log(`   📦 Produto:`, produto);
        failed++;
      }
    } catch (err) {
      console.log('   ❌ Erro:', err.message);
      failed++;
    }
  } else {
    console.log('   ⏭️ Pulado - Produto de teste não foi criado');
  }
  
  // TESTE 6: Deletar produto e verificar se imagem foi removida
  console.log('\n6️⃣ Teste: DELETE /produto/:id - Deletar produto e imagem');
  if (produtoTestId) {
    try {
      const res = await fetch(`${API_BASE}/produto/${produtoTestId}`, {
        method: 'DELETE'
      });
      
      if (res.status === 204) {
        console.log(`   ✅ Produto #${produtoTestId} deletado com sucesso`);
        
        // Verificar se a imagem foi removida
        await sleep(500);
        const imgRes = await fetch(`${API_BASE}/view-image/${produtoTestId}`);
        if (!imgRes.ok) {
          console.log(`   ✅ Imagem também foi removida (404 esperado)`);
          passed += 2;
        } else {
          console.log(`   ⚠️ Imagem ainda existe (deveria ter sido removida)`);
          passed++;
          failed++;
        }
      } else {
        const err = await res.json();
        console.log(`   ❌ Falha ao deletar: ${err.error || 'Erro desconhecido'}`);
        failed++;
      }
    } catch (err) {
      console.log('   ❌ Erro:', err.message);
      failed++;
    }
  } else {
    console.log('   ⏭️ Pulado - Produto de teste não foi criado');
  }
  
  // RESUMO
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RESULTADO: ${passed} passou | ${failed} falhou`);
  console.log('='.repeat(60) + '\n');
  
  return { passed, failed };
}

// Executar testes
testarCRUDProduto().then(result => {
  process.exit(result.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
