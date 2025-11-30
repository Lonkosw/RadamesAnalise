# 📋 RELATÓRIO: Fluxo de Pedidos conforme Modelo do Professor

## Projeto: HabibPerfumeShop
**Data:** 30/11/2025  
**Modelo de Referência:** dw1-modelo-4bim (CandyShop)

---

## 📊 RESUMO EXECUTIVO

Este relatório documenta a implementação do fluxo completo de pedidos no projeto HabibPerfumeShop, seguindo exatamente o modelo do professor (CandyShop/dw1-modelo-4bim).

### ✅ O que foi implementado:

| Item | Status | Descrição |
|------|--------|-----------|
| Migração do Banco | ✅ | Script SQL completo para criar tabelas de pagamento |
| pedidoController | ✅ | Rotas `/pedido/online` e `/pedido/gerente` |
| pagamentoController | ✅ | CRUD completo + formas de pagamento |
| pedido_has_produtoController | ✅ | Inserção em lote |
| Frontend visaoCliente | ✅ | index, carrinho, finalizar, pagamento, pedidos |
| Rotas de login | ✅ | Redirecionamentos para visão do cliente |

---

## 🗃️ ALTERAÇÕES NO BANCO DE DADOS

### Script de Migração
**Arquivo:** `documentacao/migracao_fluxo_pedido_professor.sql`

#### Novas Tabelas Criadas:

```sql
-- 1. Tabela PAGAMENTO (PK = pedido_id_pedido)
CREATE TABLE pagamento (
    pedido_id_pedido INTEGER NOT NULL PRIMARY KEY,
    data_pagamento TIMESTAMP DEFAULT NOW(),
    valor_total_pagamento DOUBLE PRECISION,
    FOREIGN KEY (pedido_id_pedido) REFERENCES pedido(id_pedido)
);

-- 2. Tabela PAGAMENTO_HAS_FORMA_PAGAMENTO (chave composta)
CREATE TABLE pagamento_has_forma_pagamento (
    pagamento_id_pedido INTEGER NOT NULL,
    forma_pagamento_id_forma_pagamento INTEGER NOT NULL,
    valor_pago DOUBLE PRECISION,
    PRIMARY KEY (pagamento_id_pedido, forma_pagamento_id_forma_pagamento),
    FOREIGN KEY (pagamento_id_pedido) REFERENCES pagamento(pedido_id_pedido),
    FOREIGN KEY (forma_pagamento_id_forma_pagamento) REFERENCES forma_pagamento(id_forma_pagamento)
);
```

#### Alterações em Tabelas Existentes:

- **pessoa:** Adicionada coluna `endereco_pessoa VARCHAR(150)`
- **pedido:** Adicionada coluna `funcionario_pessoa_cpf_pessoa VARCHAR(20)` com FK para funcionario
- **pedido:** Renomeada coluna `cliente_cpf` → `cliente_pessoa_cpf_pessoa`

#### Funcionário Online Padrão:

```sql
-- CPF 00000000000 para pedidos online
INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa) 
VALUES ('00000000000', 'online', 'online@habib.com');

INSERT INTO funcionario (cpf, cargo, pessoa_cpf_pessoa) 
VALUES ('00000000000', 'Vendedor online', '00000000000');
```

---

## 🔧 BACKEND - CONTROLLERS

### 1. pedidoController.js

**Novas funções implementadas:**

| Função | Rota | Descrição |
|--------|------|-----------|
| `criarPedidoOnline` | `POST /pedido/online` | Cria pedido e-commerce com funcionário default |
| `criarPedido` | `POST /pedido/gerente` | Cria pedido manual (funcionário define) |
| `listarPedidos` | `GET /pedido` | Lista todos os pedidos |
| `obterPedido` | `GET /pedido/:id` | Busca pedido por ID |
| `atualizarPedido` | `PUT /pedido/:id` | Atualiza pedido |
| `deletarPedido` | `DELETE /pedido/:id` | Remove pedido |
| `listarPedidosPorCliente` | `GET /pedido/cliente/:cpf` | Pedidos de um cliente |

### 2. pagamentoController.js (NOVO)

**Arquivo:** `backend/controllers/pagamentoController.js`

| Função | Rota | Descrição |
|--------|------|-----------|
| `abrirTelaPagamento` | `GET /pagamento/abrirTelaPagamento` | Abre página de pagamento (cliente) |
| `abrirCrudPagamento` | `GET /pagamento/abrirCrudPagamento` | Abre CRUD (gerente) |
| `listarPagamentos` | `GET /pagamento` | Lista todos os pagamentos |
| `criarPagamento` | `POST /pagamento` | Cria pagamento simples |
| `criarPagamentoCompleto` | `POST /pagamento/completo` | Cria pagamento + formas |
| `obterPagamento` | `GET /pagamento/:id` | Busca por ID do pedido |
| `atualizarPagamento` | `PUT /pagamento/:id` | Atualiza pagamento |
| `deletarPagamento` | `DELETE /pagamento/:id` | Remove pagamento |
| `listarFormasPagamentoDoPedido` | `GET /pagamento/:id/formas` | Formas de um pedido |
| `adicionarFormaPagamento` | `POST /pagamento/:id/formas` | Adiciona forma |
| `atualizarFormaPagamentoDoPedido` | `PUT /pagamento/:idPedido/formas/:idForma` | Atualiza valor |
| `removerFormaPagamentoDoPedido` | `DELETE /pagamento/:idPedido/formas/:idForma` | Remove forma |

### 3. pedido_has_produtoController.js

**Função de inserção em lote:**

```javascript
// POST /pedido_has_produto/lote
exports.criarItensPedidoEmLote = async (req, res) => {
  const itens = req.body; // Array de itens
  // Insere todos de uma vez com INSERT múltiplo
};
```

---

## 🛤️ BACKEND - ROTAS

### pedidoRoutes.js

```javascript
router.get('/abrirCrudPedido', pedidoController.abrirCrudPedido);
router.get('/', pedidoController.listarPedidos);
router.post('/gerente', pedidoController.criarPedido);
router.post('/online', pedidoController.criarPedidoOnline);
router.get('/:id', pedidoController.obterPedido);
router.put('/:id', pedidoController.atualizarPedido);
router.delete('/:id', pedidoController.deletarPedido);
router.get('/cliente/:cpf', pedidoController.listarPedidosPorCliente);
```

### pagamentoRoutes.js (NOVO)

```javascript
router.get('/abrirCrudPagamento', pagamentoController.abrirCrudPagamento);
router.get('/abrirTelaPagamento', pagamentoController.abrirTelaPagamento);
router.get('/', pagamentoController.listarPagamentos);
router.post('/', pagamentoController.criarPagamento);
router.post('/completo', pagamentoController.criarPagamentoCompleto);
router.get('/:id', pagamentoController.obterPagamento);
router.put('/:id', pagamentoController.atualizarPagamento);
router.delete('/:id', pagamentoController.deletarPagamento);
router.get('/:id/formas', pagamentoController.listarFormasPagamentoDoPedido);
router.post('/:id/formas', pagamentoController.adicionarFormaPagamento);
router.put('/:idPedido/formas/:idForma', pagamentoController.atualizarFormaPagamentoDoPedido);
router.delete('/:idPedido/formas/:idForma', pagamentoController.removerFormaPagamentoDoPedido);
```

### loginRoutes.js

```javascript
router.get('/visaocliente', ...);           // Área do cliente
router.get('/visaoclientecarrinho', ...);   // Carrinho
router.get('/visaoclientefinalizar', ...);  // Finalização
router.get('/visaoclientepagamento', ...);  // Pagamento
```

---

## 🎨 FRONTEND - visaoCliente

### Estrutura de Pastas

```
frontend/visaoCliente/
├── index.html          # Página inicial da área do cliente
├── index.css
├── index.js
├── carrinho/
│   ├── carrinho.html   # Carrinho de compras
│   ├── carrinho.css
│   └── carrinho.js
├── finalizar/
│   ├── finalizar.html  # Conferência do pedido
│   ├── finalizar.css
│   └── finalizar.js
├── pagamento/
│   ├── pagamento.html  # Pagamento com múltiplas formas
│   ├── pagamento.css
│   └── pagamento.js
└── pedidos/
    ├── pedidos.html    # Histórico de pedidos
    ├── pedidos.css
    └── pedidos.js
```

### Fluxo de Compra (E-commerce)

```
1. /menu                        → Catálogo de produtos
                                   ↓ [Adicionar ao Carrinho]
2. visaoCliente/carrinho        → Ver itens, ajustar quantidades
                                   ↓ [Finalizar Pedido]
3. visaoCliente/finalizar       → Conferir pedido, criar no banco
                                   ↓ [Ir para Pagamento]
4. visaoCliente/pagamento       → Selecionar formas de pagamento
                                   ↓ [Finalizar Pagamento]
5. visaoCliente/pedidos         → Ver histórico de pedidos
```

---

## 🔄 FLUXO DE DADOS

### Criação de Pedido Online

```
Frontend (finalizar.js):
  1. POST /pedido/online
     Body: { data_pedido, cliente_pessoa_cpf_pessoa }
     
  2. POST /pedido_has_produto/lote
     Body: [{ id_pedido, id_produto, quantidade, preco }]
     
  3. Armazena dadosPagamento no sessionStorage
  
  4. Redireciona para pagamento.html
```

### Registro de Pagamento

```
Frontend (pagamento.js):
  1. POST /pagamento/completo
     Body: {
       pedido_id_pedido: 123,
       valor_total: 150.00,
       formas: [
         { id_forma: 1, valor: 100.00 },
         { id_forma: 2, valor: 50.00 }
       ]
     }
     
  2. Backend cria:
     - 1 registro em pagamento
     - N registros em pagamento_has_forma_pagamento
```

---

## 📋 COMO TESTAR

### 1. Aplicar Migração no Banco

```bash
# Via psql
psql -U postgres -d habib-shop -f documentacao/migracao_fluxo_pedido_professor.sql

# Ou via pgAdmin: executar o script SQL
```

### 2. Iniciar o Servidor

```bash
cd HabibPerfumeShop/backend
npm start
```

### 3. Testar o Fluxo

1. Acesse `http://localhost:3001/login/login.html`
2. Faça login como cliente
3. Vá ao menu de produtos (`/menu`)
4. Adicione produtos ao carrinho
5. Acesse `/login/visaoclientecarrinho`
6. Finalize o pedido → Confirme → Pague

### 4. Verificar no Banco

```sql
-- Pedidos criados
SELECT * FROM pedido ORDER BY id_pedido DESC;

-- Itens do pedido
SELECT * FROM pedido_has_produto WHERE pedido_id_pedido = <ID>;

-- Pagamentos
SELECT * FROM pagamento;

-- Formas de pagamento usadas
SELECT * FROM pagamento_has_forma_pagamento;
```

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

### Diferenças Mantidas do Projeto Original

1. **Senhas com bcrypt:** Mantido por segurança (superior ao texto puro do modelo do professor)
2. **Cookie `usuario`:** Mantido o nome (mais limpo que `usuarioLogado`)
3. **Campos de produto:** Mantidos campos específicos de perfumaria (marca, volume, concentração)
4. **Views de compatibilidade:** `v_cliente_compat` e `v_funcionario_compat` mantidas

### Compatibilidade com Modelo do Professor

| Aspecto | Implementado | Conforme Modelo |
|---------|--------------|-----------------|
| POST /pedido/online | ✅ | ✅ |
| POST /pedido/gerente | ✅ | ✅ |
| Funcionário default 00000000000 | ✅ | ✅ |
| Tabela pagamento | ✅ | ✅ |
| Tabela pagamento_has_forma_pagamento | ✅ | ✅ |
| POST /pedido_has_produto/lote | ✅ | ✅ |
| Frontend visaoCliente | ✅ | ✅ |

---

## 📁 ARQUIVOS MODIFICADOS/CRIADOS

### Novos Arquivos

- `documentacao/migracao_fluxo_pedido_professor.sql`
- `backend/controllers/pagamentoController.js`
- `backend/routes/pagamentoRoutes.js`
- `frontend/visaoCliente/index.html`
- `frontend/visaoCliente/index.css`
- `frontend/visaoCliente/index.js`
- `frontend/visaoCliente/carrinho/carrinho.html`
- `frontend/visaoCliente/carrinho/carrinho.css`
- `frontend/visaoCliente/carrinho/carrinho.js`
- `frontend/visaoCliente/finalizar/finalizar.html`
- `frontend/visaoCliente/finalizar/finalizar.css`
- `frontend/visaoCliente/finalizar/finalizar.js`
- `frontend/visaoCliente/pagamento/pagamento.html`
- `frontend/visaoCliente/pagamento/pagamento.css`
- `frontend/visaoCliente/pagamento/pagamento.js`
- `frontend/visaoCliente/pedidos/pedidos.html`
- `frontend/visaoCliente/pedidos/pedidos.css`
- `frontend/visaoCliente/pedidos/pedidos.js`

### Arquivos Modificados

- `backend/controllers/pedidoController.js`
- `backend/routes/pedidoRoutes.js`
- `backend/routes/loginRoutes.js`
- `backend/server.js`

---

## ✅ CONCLUSÃO

O fluxo de pedidos do HabibPerfumeShop foi implementado seguindo exatamente o modelo do professor (CandyShop/dw1-modelo-4bim), incluindo:

- ✅ Rotas `/pedido/online` e `/pedido/gerente`
- ✅ Funcionário default para pedidos online
- ✅ Tabelas de pagamento com múltiplas formas
- ✅ Inserção em lote de itens do pedido
- ✅ Frontend completo para área do cliente
- ✅ Integração total com sistema de login

O projeto agora está pronto para avaliação conforme os critérios do 4º bimestre.

---

*Relatório gerado em 30/11/2025*
