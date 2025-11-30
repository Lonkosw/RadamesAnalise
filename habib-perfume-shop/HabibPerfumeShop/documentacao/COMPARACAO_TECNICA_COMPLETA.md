# 📊 COMPARAÇÃO TÉCNICA COMPLETA

## Projeto A (HabibPerfumeShop) vs Projeto B (CandyShop 4bim - Professor)

**Data da análise:** 27/11/2025  
**Versão:** 1.0

---

# 🔬 SEÇÃO 1: ARQUITETURA GERAL

## A. Estrutura de Pastas

| Aspecto | Projeto A (HabibPerfumeShop) | Projeto B (CandyShop) | Diferença |
|---------|------------------------------|----------------------|-----------|
| **Raiz** | `backend/`, `frontend/`, `documentacao/`, `imagens/`, `uploads/` | `backend/`, `frontend/`, `documentacao/`, `imagens/` | A tem `uploads/` extra |
| **Backend** | `controllers/`, `routes/`, `middleware/`, `scripts/` | `controllers/`, `routes/` | A tem middleware separado |
| **Frontend** | 17 subpastas (carrinho, cliente, etc) | 7 subpastas + visaoCliente | B tem organização diferente para e-commerce |

## B. Padrão MVC

| Projeto | Padrão | Observações |
|---------|--------|-------------|
| **A** | MVC adaptado com middleware | Separação clara de auth em `middleware/auth.js`, controllers robustos |
| **B** | MVC simples | Auth inline nos controllers, sem pasta middleware separada |

**Vencedor:** Projeto A - melhor separação de responsabilidades

## C. Fluxo de Requisição

```
PROJETO A:
Request → cookieParser → parseUser (middleware) → CORS → express.json → Rotas → Controller → Response

PROJETO B:
Request → express.json → cookieParser → CORS → Rotas → Controller → Response
```

**Diferença crítica:** A tem middleware `parseUser` que popula `req.usuario` ANTES das rotas

---

# 🔬 SEÇÃO 2: MODELOS DO BANCO DE DADOS

## Tabela Comparativa Completa

### 2.1 TABELA: `pessoa`

| Coluna | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| PK | `cpf_pessoa VARCHAR(20)` | `cpf_pessoa VARCHAR(20)` | ✅ IGUAL |
| `nome_pessoa` | VARCHAR(60) | VARCHAR(60) | ✅ IGUAL |
| `data_nascimento_pessoa` | DATE (como `data_nascimento`) | DATE | A usa nome abreviado |
| `endereco_pessoa` | ❌ NÃO TEM | VARCHAR(150) | ⚠️ A NÃO TEM |
| `senha_pessoa` | VARCHAR(255) (bcrypt) | VARCHAR(50) | A usa hash bcrypt mais longo |
| `email_pessoa` | VARCHAR(75) UNIQUE | VARCHAR(75) UNIQUE | ✅ IGUAL |
| `primeiro_acesso_pessoa` | ✅ TEM (BOOLEAN) | ❌ NÃO TEM | A tem campo extra |

**🔴 CRÍTICO:** 
- A não tem `endereco_pessoa` (campo existe no B)
- A tem `primeiro_acesso_pessoa` (campo não existe no B)

---

### 2.2 TABELA: `cargo`

| Coluna | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| PK | `id_cargo SERIAL` | `id_cargo SERIAL` | ✅ IGUAL |
| `nome_cargo` | VARCHAR(45) | VARCHAR(45) | ✅ IGUAL |

**✅ COMPATÍVEL**

---

### 2.3 TABELA: `funcionario`

| Coluna | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| PK | `cpf CHAR(11)` | `pessoa_cpf_pessoa VARCHAR(20)` | ⚠️ NOME DIFERENTE |
| FK pessoa | `pessoa_cpf_pessoa` | IMPLÍCITA (PK = FK) | A tem FK explícita |
| `salario` | NUMERIC(10,2) como `salario` | `salario_funcionario DOUBLE PRECISION` | ⚠️ TIPO E NOME DIFERENTE |
| `cargo` | VARCHAR(50) | ❌ NÃO TEM (só cargo_id) | A tem texto + ID |
| `cargo_id_cargo` | INTEGER FK | INTEGER FK | ✅ IGUAL |
| `porcentagem_comissao` | NUMERIC(5,2) | `porcentagem_comissao_funcionario DOUBLE` | ⚠️ NOME DIFERENTE |

**🔴 CRÍTICO:**
- PK diferente: A usa `cpf`, B usa `pessoa_cpf_pessoa`
- A tem coluna `cargo` (texto) que B não tem
- Nomes de colunas divergentes

---

### 2.4 TABELA: `cliente`

| Coluna | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| PK | `cpf CHAR(11)` | `pessoa_cpf_pessoa VARCHAR(20)` | ⚠️ NOME DIFERENTE |
| FK pessoa | `pessoa_cpf_pessoa` | IMPLÍCITA (PK = FK) | A tem FK explícita |
| `renda_cliente` | DOUBLE PRECISION | DOUBLE PRECISION | ✅ IGUAL |
| `data_cadastro_cliente` | DATE | DATE | ✅ IGUAL |

**🔴 CRÍTICO:** PK diferente

---

### 2.5 TABELA: `produto`

| Coluna | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| PK | `id_produto SERIAL` | `id_produto SERIAL` | ✅ IGUAL |
| `nome_produto` | VARCHAR(100) | VARCHAR(45) | ⚠️ Tamanho diferente |
| `marca_produto` | VARCHAR(100) | ❌ NÃO TEM | ⚠️ APENAS A |
| `volume_ml` | INT | ❌ NÃO TEM | ⚠️ APENAS A |
| `concentracao` | VARCHAR(50) | ❌ NÃO TEM | ⚠️ APENAS A |
| `descricao_produto` | TEXT | ❌ NÃO TEM | ⚠️ APENAS A |
| `preco_produto` | NUMERIC(10,2) | `preco_unitario_produto DOUBLE` | ⚠️ NOME E TIPO DIFERENTE |
| `quantidade_estoque` | INT | `quantidade_estoque_produto INT` | ⚠️ NOME DIFERENTE |

**🔴 CRÍTICO:** 
- A tem campos específicos de perfumaria (marca, volume, concentracao, descricao)
- Nomes das colunas de preço e estoque são diferentes

---

### 2.6 TABELA: `pedido`

| Coluna | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| PK | `id_pedido SERIAL` | `id_pedido SERIAL` | ✅ IGUAL |
| `data_pedido` | `TIMESTAMP WITH TIME ZONE DEFAULT now()` | `DATE` | ⚠️ TIPO DIFERENTE |
| FK cliente | `cliente_cpf CHAR(11)` | `cliente_pessoa_cpf_pessoa VARCHAR(20)` | ⚠️ NOME DIFERENTE |
| FK funcionario | ❌ NÃO TEM | `funcionario_pessoa_cpf_pessoa VARCHAR(20)` | 🔴 A NÃO TEM |

**🔴 CRÍTICO:**
- A não tem `funcionario_pessoa_cpf_pessoa` - pedidos não são associados a funcionários
- Nome da FK cliente é diferente
- Tipo de data_pedido diferente (A usa TIMESTAMP, B usa DATE)

---

### 2.7 TABELA: `pedido_has_produto`

| Coluna | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| PK composta | `(pedido_id_pedido, produto_id_produto)` | `(produto_id_produto, pedido_id_pedido)` | ⚠️ ORDEM DIFERENTE |
| `pedido_id_pedido` | INT FK | INT FK | ✅ IGUAL |
| `produto_id_produto` | INT FK | INT FK | ✅ IGUAL |
| `quantidade` | INT | INT | ✅ IGUAL |
| `preco_unitario` | NUMERIC(10,2) | DOUBLE PRECISION | ⚠️ TIPO DIFERENTE |

**⚠️ MÉDIO:** Ordem da PK e tipo de preco são diferentes

---

### 2.8 TABELA: `forma_pagamento`

| Coluna | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| PK | `id_forma_pagamento SERIAL` | `id_forma_pagamento SERIAL` | ✅ IGUAL |
| nome | `nome_forma VARCHAR(50)` | `nome_forma_pagamento VARCHAR(100)` | ⚠️ NOME E TAMANHO DIFERENTE |

---

### 2.9 TABELA: `pagamento`

| Coluna | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| PK | ❌ NÃO TEM TABELA | `pedido_id_pedido INT` | 🔴 A NÃO TEM |
| `data_pagamento` | ❌ | TIMESTAMP | - |
| `valor_total_pagamento` | ❌ | DOUBLE PRECISION | - |

**🔴 CRÍTICO:** A não tem tabela `pagamento`

---

### 2.10 TABELA: `pagamento_has_forma_pagamento`

| Coluna | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| Tabela inteira | ❌ NÃO TEM | ✅ TEM | 🔴 A NÃO TEM |

**🔴 CRÍTICO:** A não tem esta tabela de relacionamento N:N

---

# 🔬 SEÇÃO 3: CONTROLLERS - COMPARAÇÃO LINHA A LINHA

## 3.1 `pessoaController.js`

| Função | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| `listarPessoas` | `ORDER BY id_pessoa` | `ORDER BY cpf_pessoa` | A usa `id_pessoa` que NÃO EXISTE |
| `criarPessoa` | Usa campos antigos | Usa campos do modelo | A está desatualizado |
| `obterPessoa` | `WHERE id_pessoa = $1` | `WHERE cpf_pessoa = $1` | 🔴 A QUEBRADO |
| Auth check | ❌ NÃO TEM | Verifica cookie `usuarioLogado` | B verifica auth |

**🔴 CRÍTICO:** pessoaController de A usa `id_pessoa` que não existe no schema atual!

---

## 3.2 `clienteController.js`

| Função | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| `listarClientes` | USA VIEW `v_cliente_compat` | JOIN manual pessoa+cliente | A usa abstração |
| `criarCliente` | Grava em PESSOA + CLIENTE separado | Grava só em CLIENTE | A segue modelo normalizado |
| `obterCliente` | USA VIEW | SELECT * FROM cliente | A usa abstração |
| Validações | bcrypt, isCpf, isEmail | Validação básica | A mais robusto |
| Paginação | ✅ TEM (page, limit) | ❌ NÃO TEM | A mais completo |

**✅ A É SUPERIOR** - Projeto A tem implementação mais completa e segura

---

## 3.3 `funcionarioController.js`

| Função | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| `listarFuncionario` | USA VIEW `v_funcionario_compat` | Query com ERRO de alias (`cli`) | B tem bug |
| `criarFuncionario` | Grava em PESSOA + FUNCIONARIO | Só FUNCIONARIO | A correto |
| `atualizarFuncionario` | Update dinâmico em 2 tabelas | Update simples | A mais completo |
| Proteção gerente master | ✅ TEM | ❌ NÃO TEM | A mais seguro |
| Hash de senha | bcrypt | ❌ Texto puro | A mais seguro |

**🔴 CRÍTICO B:** Query em `listarFuncionarios` usa alias `cli` mas define `func` - vai quebrar!

```javascript
// PROJETO B - BUG:
'SELECT func.pessoa_cpf_pessoa, p.nome_pessoa,func.salario_funcionario,func.cargo_id_cargo 
 FROM funcionario cli, pessoa p where func.pessoa_cpf_pessoa = p.cpf_pessoa'
//                 ↑ define 'cli' mas usa 'func' depois - ERRO!
```

---

## 3.4 `produtoController.js`

| Função | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| Campos | nome, marca, volume_ml, concentracao, descricao, preco, estoque | nome, quantidade_estoque, preco_unitario | A tem mais campos |
| Nome coluna preço | `preco_produto` | `preco_unitario_produto` | ⚠️ DIFERENTE |
| Nome coluna estoque | `quantidade_estoque` | `quantidade_estoque_produto` | ⚠️ DIFERENTE |
| Filtros | q, min_preco, max_preco | Nenhum | A mais completo |

**⚠️ ALTO:** Nomes de colunas incompatíveis

---

## 3.5 `pedidoController.js`

| Função | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| `listarPedidos` | JOIN com pessoa via cliente | SELECT * simples | A mais completo |
| `criarPedido` | Via `comprarDireto` ou `finalizarCarrinho` | Via `criarPedido` ou `criarPedidoOnline` | Fluxos diferentes |
| FK funcionario | ❌ NÃO USA | ✅ USA `funcionario_pessoa_cpf_pessoa` | 🔴 DIFERENTE |
| Funcionario default | ❌ NÃO TEM | `00000000000` para pedidos online | B tem conceito |
| Rotas especiais | `/comprar`, `/carrinho/finalizar` | `/gerente`, `/online` | Nomes diferentes |

**🔴 CRÍTICO:**
- A não associa pedido a funcionário
- B tem conceito de "pedido online" com funcionário default
- Rotas completamente diferentes

---

## 3.6 `loginController.js`

| Função | Projeto A | Projeto B | Diferença |
|--------|-----------|-----------|-----------|
| Cookie name | `usuario` | `usuarioLogado` | ⚠️ DIFERENTE |
| Hash senha | bcrypt | Texto puro | A mais seguro |
| Login universal | ✅ TEM | ❌ NÃO TEM | A mais completo |
| Login funcionário | Por email ou cpf | Por email | A mais flexível |
| Visão cliente | ❌ NÃO TEM rotas | ✅ TEM (visaocliente, carrinho, finalizar) | B tem e-commerce |
| Gerente master auto-create | ✅ TEM | ❌ NÃO TEM | A tem provisioning |

**⚠️ ALTO:** Cookie com nome diferente causa incompatibilidade total de sessões

---

## 3.7 `pagamentoController.js`

| Aspecto | Projeto A | Projeto B |
|---------|-----------|-----------|
| Existência | ❌ NÃO TEM | ✅ TEM |
| Funções | - | CRUD completo |

**🔴 CRÍTICO:** A não tem módulo de pagamento

---

# 🔬 SEÇÃO 4: ROTAS - COMPARAÇÃO

## 4.1 Rotas de Pedido

| Rota | Projeto A | Projeto B |
|------|-----------|-----------|
| `GET /pedido` | Lista todos (funcionário) | Lista todos |
| `POST /pedido` | ❌ NÃO TEM | ❌ NÃO TEM |
| `POST /pedido/comprar` | ✅ Compra direta | ❌ NÃO TEM |
| `POST /pedido/carrinho/finalizar` | ✅ Finaliza carrinho | ❌ NÃO TEM |
| `POST /pedido/gerente` | ❌ NÃO TEM | ✅ Criar pedido manual |
| `POST /pedido/online` | ❌ NÃO TEM | ✅ Pedido e-commerce |
| `GET /pedido/cliente/:cpf` | ✅ Pedidos do cliente | ❌ NÃO TEM |

**⚠️ ALTO:** Fluxos de criação de pedido completamente diferentes

---

## 4.2 Rotas de Login

| Rota | Projeto A | Projeto B |
|------|-----------|-----------|
| `POST /login/cliente` | ✅ | ❌ (só verificarSenha) |
| `POST /login/funcionario` | ✅ | ❌ |
| `POST /login/universal` | ✅ | ❌ |
| `GET /login/status` | ✅ | `GET /login/verificaSeUsuarioEstaLogado` |
| `POST /login/logout` | ✅ | `GET /login/logout` |
| `GET /login/visaocliente` | ❌ | ✅ |
| `GET /login/visaoclientecarrinho` | ❌ | ✅ |
| `GET /login/visaoclientefinalizar` | ❌ | ✅ |
| `GET /login/visaoclientepagamento` | ❌ | ✅ |

**⚠️ ALTO:** B tem rotas de navegação e-commerce que A não tem

---

## 4.3 Rotas de pedido_has_produto

| Rota | Projeto A | Projeto B |
|------|-----------|-----------|
| `GET /:id_pedido/:id_produto` | ✅ | ✅ |
| `POST /lote` | ❌ | ✅ Inserção em lote |
| `GET /:idPedido` (itens de um pedido) | ❌ | ✅ |

---

# 🔬 SEÇÃO 5: AUTENTICAÇÃO E SESSÃO

| Aspecto | Projeto A | Projeto B | Impacto |
|---------|-----------|-----------|---------|
| **Cookie name** | `usuario` | `usuarioLogado` | 🔴 Incompatível |
| **Cookie httpOnly** | `true` | `true` | ✅ Igual |
| **Cookie sameSite** | `Lax` | `None` | ⚠️ Diferente |
| **Cookie secure** | `false` (dev) | `true` | ⚠️ B exige HTTPS |
| **Middleware parseUser** | ✅ Global | ❌ Inline | A mais organizado |
| **Estrutura JSON cookie (cliente)** | `{tipo, cpf, nome, email}` | `{cpf_pessoa, nome, ehCliente, ehFuncionario}` | ⚠️ Diferente |
| **Hash de senha** | bcrypt | Texto puro | A mais seguro |

**🔴 CRÍTICO:** Estrutura do cookie completamente diferente!

---

# 🔬 SEÇÃO 6: FRONTEND

## 6.1 Páginas E-commerce

| Página | Projeto A | Projeto B |
|--------|-----------|-----------|
| Visão Cliente (catálogo) | ❌ | ✅ `visaoCliente/index.html` |
| Carrinho | ✅ `carrinho/carrinho.html` | ✅ `visaoCliente/carrinho/` |
| Finalizar compra | ❌ | ✅ `visaoCliente/finalizar/` |
| Pagamento | ❌ | ✅ `visaoCliente/pagamento/` |

## 6.2 CRUDs

| CRUD | Projeto A | Projeto B |
|------|-----------|-----------|
| Pessoa | ✅ | ✅ |
| Cliente | ✅ | ❌ (só via login) |
| Funcionário | ✅ | ❌ (só via CRUD genérico) |
| Produto | ✅ | ✅ |
| Pedido | ✅ `pedido/lista.html` | ✅ `pedido/pedido.html` |
| Cargo | ✅ | ✅ |
| Forma Pagamento | ✅ | ✅ |

---

# 📊 SEÇÃO 7: RESUMO DAS DIVERGÊNCIAS

## 🔴 DIVERGÊNCIAS CRÍTICAS (quebram o sistema)

| # | Descrição | Projeto Afetado |
|---|-----------|-----------------|
| 1 | `pessoaController.js` usa `id_pessoa` que não existe | A |
| 2 | Tabela `pedido` não tem FK para funcionário | A |
| 3 | Tabelas `pagamento` e `pagamento_has_forma_pagamento` não existem | A |
| 4 | Cookie com nome diferente (`usuario` vs `usuarioLogado`) | Ambos |
| 5 | `funcionarioController.js` do B tem bug de alias SQL | B |
| 6 | Coluna `endereco_pessoa` não existe em A | A |

## 🟠 DIVERGÊNCIAS ALTAS (impactam migração/integração)

| # | Descrição |
|---|-----------|
| 1 | PK de cliente: `cpf` (A) vs `pessoa_cpf_pessoa` (B) |
| 2 | PK de funcionario: `cpf` (A) vs `pessoa_cpf_pessoa` (B) |
| 3 | FK pedido→cliente: `cliente_cpf` (A) vs `cliente_pessoa_cpf_pessoa` (B) |
| 4 | Nomes de colunas em produto incompatíveis |
| 5 | Estrutura do JSON do cookie completamente diferente |
| 6 | Rotas de pedido com nomes e fluxos diferentes |
| 7 | A usa views de compatibilidade, B usa queries diretas |

## 🟡 DIVERGÊNCIAS MÉDIAS (diferenças de padrão)

| # | Descrição |
|---|-----------|
| 1 | A usa bcrypt para senhas, B usa texto puro |
| 2 | A tem middleware de auth separado, B tem inline |
| 3 | A tem paginação em listarClientes, B não tem |
| 4 | Tipo de `data_pedido`: TIMESTAMP (A) vs DATE (B) |
| 5 | A tem campos específicos de perfumaria em produto |
| 6 | A tem proteção de gerente master, B não tem |

## 🟢 DIVERGÊNCIAS BAIXAS (estética/organização)

| # | Descrição |
|---|-----------|
| 1 | A tem `uploads/` na raiz, B não tem |
| 2 | A tem scripts em `backend/scripts/`, B não tem |
| 3 | A tem mais CRUDs no frontend |
| 4 | B tem visaoCliente organizada em subpastas |

---

# 📋 SEÇÃO 8: O QUE FALTA NO MEU PROJETO (A)

| # | Item Faltante | Prioridade |
|---|---------------|------------|
| 1 | Tabela `pagamento` | CRÍTICA |
| 2 | Tabela `pagamento_has_forma_pagamento` | CRÍTICA |
| 3 | Coluna `endereco_pessoa` em pessoa | ALTA |
| 4 | Coluna `funcionario_pessoa_cpf_pessoa` em pedido | ALTA |
| 5 | Rota `POST /pedido/gerente` | MÉDIA |
| 6 | Rota `POST /pedido/online` | MÉDIA |
| 7 | Frontend visaoCliente (catálogo, finalizar, pagamento) | MÉDIA |
| 8 | Rota `POST /pedido_has_produto/lote` | BAIXA |

---

# 📋 SEÇÃO 9: O QUE EXISTE NO MEU PROJETO MAS NÃO DEVERIA

| # | Item Extra | Ação Recomendada |
|---|------------|------------------|
| 1 | Campo `primeiro_acesso_pessoa` em pessoa | Avaliar se necessário |
| 2 | Campos de perfumaria em produto (marca, volume, concentracao, descricao) | Manter (específico do negócio) |
| 3 | Rota `POST /pedido/comprar` | Manter (funcionalidade útil) |
| 4 | Rota `POST /pedido/carrinho/finalizar` | Manter (funcionalidade útil) |
| 5 | Views `v_cliente_compat` e `v_funcionario_compat` | Manter (abstração útil) |
| 6 | `middleware/auth.js` separado | Manter (boa prática) |
| 7 | Hash bcrypt para senhas | Manter (segurança superior) |

---

# 🎯 SEÇÃO 10: PLANO DE PADRONIZAÇÃO

## FASE 1: Correções Críticas Imediatas

1. **Corrigir `pessoaController.js`** - Trocar `id_pessoa` por `cpf_pessoa`
2. **Criar tabela `pagamento`** com estrutura do professor
3. **Criar tabela `pagamento_has_forma_pagamento`**
4. **Adicionar coluna `funcionario_pessoa_cpf_pessoa` em pedido** (pode ser NULL para pedidos de e-commerce)
5. **Adicionar coluna `endereco_pessoa` em pessoa**

## FASE 2: Padronização de Nomenclatura (PKs e FKs)

1. Renomear PKs de cliente/funcionario para `pessoa_cpf_pessoa` se necessário
2. Ou manter `cpf` e documentar a diferença
3. Padronizar nomes de colunas em produto

## FASE 3: Autenticação

1. **Decisão:** Manter cookie `usuario` (A) ou migrar para `usuarioLogado` (B)?
   - **Recomendação:** Manter `usuario` - nome mais limpo
2. Ajustar estrutura do JSON no cookie se necessário
3. Manter bcrypt (superior ao texto puro do B)

## FASE 4: Rotas e Controllers

1. Adicionar rota `POST /pedido/gerente` para pedidos manuais
2. Adicionar rota `POST /pedido/online` com funcionário default
3. Criar `pagamentoController.js`
4. Criar `pagamento_has_forma_pagamentoController.js`

## FASE 5: Frontend E-commerce

1. Criar ou adaptar `visaoCliente/` com:
   - Catálogo de produtos
   - Finalização de compra
   - Tela de pagamento

---

# 📊 CONCLUSÃO

| Aspecto | Projeto A (HabibPerfumeShop) | Projeto B (CandyShop) |
|---------|------------------------------|----------------------|
| **Segurança** | ✅ Superior (bcrypt, middleware) | ❌ Básica (texto puro) |
| **Organização** | ✅ Superior (middleware separado) | ⚠️ Básica |
| **Completude BD** | ❌ Faltam tabelas de pagamento | ✅ Completo |
| **E-commerce** | ⚠️ Parcial | ✅ Completo |
| **Bugs conhecidos** | `pessoaController` desatualizado | `funcionarioController` com bug SQL |
| **Manutenibilidade** | ✅ Superior (views, abstrações) | ⚠️ Básica |

**VEREDICTO GERAL:**
- O Projeto A tem arquitetura superior mas está incompleto em relação ao modelo do professor
- O Projeto B é o modelo de referência mas tem implementação de segurança inferior
- **Recomendação:** Manter a arquitetura do A e adicionar os elementos faltantes do B

---

*Relatório gerado automaticamente em 27/11/2025*
