# 🔄 PLANO DE MIGRAÇÃO COMPLETA - OPÇÃO A
## HabibPerfumeShop → Modelo do Professor (CandyShop)

---

## 📋 SUMÁRIO EXECUTIVO

**Data de Criação:** 27/11/2025  
**Objetivo:** Migrar o banco de dados e backend do HabibPerfumeShop para alinhar 100% com o modelo do professor (CandyShop), mantendo funcionalidades específicas de perfumaria e garantindo ZERO downtime.

---

# 🔍 FASE 0 — ANÁLISE COMPLETA DO SISTEMA ATUAL

## 📊 1. INVENTÁRIO DO BANCO DE DADOS ATUAL

### Tabelas Existentes (6 tabelas)
| Tabela | Chave Primária | Descrição |
|--------|----------------|-----------|
| `cliente` | `cpf CHAR(11)` | CPF direto como PK |
| `funcionario` | `cpf CHAR(11)` | CPF direto como PK |
| `produto` | `id_produto SERIAL` | Perfumes com campos específicos |
| `pedido` | `id_pedido SERIAL` | Só referencia cliente |
| `pedido_has_produto` | `(pedido_id_pedido, produto_id_produto)` | Itens do pedido |
| `forma_pagamento` | `id_forma_pagamento SERIAL` | Formas de pagamento |

### Estrutura Detalhada do Banco Atual

```sql
-- CLIENTE (atual)
cliente (
  cpf CHAR(11) PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL
)

-- FUNCIONARIO (atual)
funcionario (
  cpf CHAR(11) PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cargo VARCHAR(50) NOT NULL,
  salario NUMERIC(10,2),
  porcentagem_comissao NUMERIC(5,2),
  email VARCHAR(100) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL
)

-- PRODUTO (atual - com campos de perfumaria)
produto (
  id_produto SERIAL PRIMARY KEY,
  nome_produto VARCHAR(100) NOT NULL,
  marca_produto VARCHAR(100),           -- ✅ MANTER
  volume_ml INT,                        -- ✅ MANTER
  concentracao VARCHAR(50),             -- ✅ MANTER
  descricao_produto TEXT,               -- ✅ MANTER
  preco_produto NUMERIC(10,2) NOT NULL,
  quantidade_estoque INT NOT NULL
)

-- PEDIDO (atual)
pedido (
  id_pedido SERIAL PRIMARY KEY,
  data_pedido TIMESTAMP WITH TIME ZONE DEFAULT now(),
  cliente_cpf CHAR(11) NOT NULL REFERENCES cliente(cpf)
)

-- FORMA_PAGAMENTO (atual)
forma_pagamento (
  id_forma_pagamento SERIAL PRIMARY KEY,
  nome_forma VARCHAR(50) NOT NULL
)
```

## 📊 2. MODELO DO PROFESSOR (CandyShop)

### Tabelas do Professor (9 tabelas)
| Tabela | Chave Primária | Descrição |
|--------|----------------|-----------|
| `pessoa` | `cpf_pessoa VARCHAR(14)` | Superclasse - dados comuns |
| `cargo` | `id_cargo INT` | Tabela de cargos |
| `cliente` | `cliente_pessoa_cpf_pessoa` | Herda de pessoa |
| `funcionario` | `funcionario_pessoa_cpf_pessoa` | Herda de pessoa |
| `produto` | `id_produto INT` | Produtos (doces no original) |
| `pedido` | `id_pedido INT` | Referencia cliente E funcionário |
| `pedido_has_produto` | `(pedido_id_pedido, produto_id_produto)` | Itens |
| `forma_pagamento` | `id_forma_pagamento INT` | Formas de pagamento |
| `pagamento` | `id_pagamento INT` | Pagamentos realizados |
| `pagamento_has_forma_pagamento` | `(pagamento_id, forma_pagamento_id)` | N:N |

### Estrutura do Modelo do Professor

```sql
-- PESSOA (superclasse)
pessoa (
  cpf_pessoa VARCHAR(14) PRIMARY KEY,
  nome_pessoa VARCHAR(100) NOT NULL,
  email_pessoa VARCHAR(100) NOT NULL,
  senha_pessoa VARCHAR(255) NOT NULL,
  primeiro_acesso_pessoa BOOLEAN DEFAULT true,
  data_nascimento DATE
)

-- CARGO (normalizado)
cargo (
  id_cargo INT PRIMARY KEY AUTO_INCREMENT,
  nome_cargo VARCHAR(50) NOT NULL
)

-- CLIENTE (herda de pessoa)
cliente (
  cliente_pessoa_cpf_pessoa VARCHAR(14) PRIMARY KEY,
  renda_cliente DECIMAL(10,2),
  data_cadastro_cliente DATETIME DEFAULT now(),
  FOREIGN KEY (cliente_pessoa_cpf_pessoa) REFERENCES pessoa(cpf_pessoa)
)

-- FUNCIONARIO (herda de pessoa)
funcionario (
  funcionario_pessoa_cpf_pessoa VARCHAR(14) PRIMARY KEY,
  cargo_id_cargo INT,
  salario_funcionario DECIMAL(10,2),
  porcentagem_comissao_funcionario DECIMAL(5,2),
  FOREIGN KEY (funcionario_pessoa_cpf_pessoa) REFERENCES pessoa(cpf_pessoa),
  FOREIGN KEY (cargo_id_cargo) REFERENCES cargo(id_cargo)
)

-- PRODUTO (com nomenclatura padronizada)
produto (
  id_produto INT PRIMARY KEY AUTO_INCREMENT,
  nome_produto VARCHAR(100) NOT NULL,
  quantidade_estoque_produto INT,
  preco_unitario_produto DECIMAL(10,2) NOT NULL,
  -- ADICIONAR CAMPOS DE PERFUMARIA:
  marca_produto VARCHAR(100),
  volume_ml INT,
  concentracao VARCHAR(50),
  descricao_produto TEXT
)

-- PEDIDO (referencia funcionário também)
pedido (
  id_pedido INT PRIMARY KEY AUTO_INCREMENT,
  data_pedido DATE DEFAULT now(),
  cliente_pessoa_cpf_pessoa VARCHAR(14),
  funcionario_pessoa_cpf_pessoa VARCHAR(14),  -- NOVO!
  FOREIGN KEY (cliente_pessoa_cpf_pessoa) REFERENCES cliente(cliente_pessoa_cpf_pessoa),
  FOREIGN KEY (funcionario_pessoa_cpf_pessoa) REFERENCES funcionario(funcionario_pessoa_cpf_pessoa)
)

-- FORMA_PAGAMENTO (com nome padronizado)
forma_pagamento (
  id_forma_pagamento INT PRIMARY KEY AUTO_INCREMENT,
  nome_forma_pagamento VARCHAR(50) NOT NULL
)

-- PAGAMENTO (nova tabela)
pagamento (
  id_pagamento INT PRIMARY KEY AUTO_INCREMENT,
  data_pagamento DATE DEFAULT now(),
  pedido_id_pedido INT NOT NULL,
  FOREIGN KEY (pedido_id_pedido) REFERENCES pedido(id_pedido)
)

-- PAGAMENTO_HAS_FORMA_PAGAMENTO (N:N - nova tabela)
pagamento_has_forma_pagamento (
  pagamento_id_pagamento INT,
  forma_pagamento_id_forma_pagamento INT,
  valor_pago DECIMAL(10,2),
  PRIMARY KEY (pagamento_id_pagamento, forma_pagamento_id_forma_pagamento),
  FOREIGN KEY (pagamento_id_pagamento) REFERENCES pagamento(id_pagamento),
  FOREIGN KEY (forma_pagamento_id_forma_pagamento) REFERENCES forma_pagamento(id_forma_pagamento)
)
```

---

## 📊 3. ANÁLISE COMPARATIVA DETALHADA

### ❌ TABELAS QUE FALTAM (criar)
| Tabela | Prioridade | Impacto |
|--------|------------|---------|
| `pessoa` | **CRÍTICA** | Base para cliente/funcionario |
| `cargo` | ALTA | Normalização de cargos |
| `pagamento` | MÉDIA | Novo fluxo de pagamento |
| `pagamento_has_forma_pagamento` | MÉDIA | N:N pagamento-forma |

### ❌ COLUNAS QUE FALTAM (adicionar)
| Tabela | Coluna | Tipo | Obrigatório |
|--------|--------|------|-------------|
| `cliente` | `renda_cliente` | DECIMAL(10,2) | Não |
| `cliente` | `data_cadastro_cliente` | TIMESTAMP | Não |
| `pessoa` | `primeiro_acesso_pessoa` | BOOLEAN | Sim (default true) |
| `pessoa` | `data_nascimento` | DATE | Não |
| `pedido` | `funcionario_pessoa_cpf_pessoa` | VARCHAR(14) | Não |

### ❌ RENOMEAÇÕES NECESSÁRIAS
| Tabela | De | Para |
|--------|-----|------|
| `cliente` | `cpf` | `cliente_pessoa_cpf_pessoa` |
| `funcionario` | `cpf` | `funcionario_pessoa_cpf_pessoa` |
| `produto` | `preco_produto` | `preco_unitario_produto` |
| `produto` | `quantidade_estoque` | `quantidade_estoque_produto` |
| `forma_pagamento` | `nome_forma` | `nome_forma_pagamento` |
| `pedido` | `cliente_cpf` | `cliente_pessoa_cpf_pessoa` |

### ✅ COLUNAS EXTRAS A MANTER (perfumaria)
| Tabela | Coluna | Motivo |
|--------|--------|--------|
| `produto` | `marca_produto` | Específico de perfumes |
| `produto` | `volume_ml` | Específico de perfumes |
| `produto` | `concentracao` | Específico de perfumes |
| `produto` | `descricao_produto` | Específico de perfumes |

---

## 📊 4. INVENTÁRIO DO BACKEND

### Controllers Existentes (13 arquivos)
| Controller | Tabela Principal | Crítico |
|------------|------------------|---------|
| `clienteController.js` | cliente | ⚠️ ALTO |
| `funcionarioController.js` | funcionario | ⚠️ ALTO |
| `loginController.js` | cliente/funcionario | ⚠️ CRÍTICO |
| `pedidoController.js` | pedido | ⚠️ ALTO |
| `produtoController.js` | produto | MÉDIO |
| `pessoaController.js` | pessoa (não existe) | BAIXO |
| `cargoController.js` | cargo (não existe) | BAIXO |
| `forma_pagamentoController.js` | forma_pagamento | MÉDIO |
| `pedido_has_produtoController.js` | pedido_has_produto | MÉDIO |
| `menuController.js` | - | BAIXO |
| `imageController.js` | - | BAIXO |
| `carrinhoController.js` | - | BAIXO |
| `avaliacaoController.js` | - | BAIXO |

### Rotas Existentes (11 arquivos)
| Rota | Monta em | Crítico |
|------|----------|---------|
| `clienteRoutes.js` | `/cliente` | ⚠️ ALTO |
| `funcionarioRoutes.js` | `/funcionario` | ⚠️ ALTO |
| `loginRoutes.js` | `/login` | ⚠️ CRÍTICO |
| `pedidoRoutes.js` | `/pedido` | ⚠️ ALTO |
| `produtoRoutes.js` | `/produto` | MÉDIO |
| `pessoaRoutes.js` | `/pessoa` | BAIXO |
| `cargoRoutes.js` | `/cargo` | BAIXO |
| `forma_pagamentoRoutes.js` | `/forma_pagamento` | MÉDIO |
| `pedido_has_produtoRoutes.js` | `/pedido_has_produto` | MÉDIO |
| `menuRoutes.js` | `/menu` | BAIXO |
| `imageRoutes.js` | `/` | BAIXO |

### Middleware de Autenticação
- **Arquivo:** `backend/middleware/auth.js`
- **Cookie:** `usuario` (JSON com tipo, cpf, nome, email)
- **Funções:**
  - `parseUser()` - extrai usuário do cookie
  - `ensureAuth()` - requer autenticação
  - `ensureFuncionario()` - requer tipo funcionário
  - `ensureGerente()` - requer cargo gerente

---

## 🚨 5. ANÁLISE DE RISCOS

### RISCO CRÍTICO 1: Sistema de Login
**Descrição:** O login usa `cliente.cpf` e `funcionario.cpf` diretamente.  
**Impacto:** Se mudar a estrutura, o login quebra imediatamente.  
**Mitigação:** Criar views/aliases durante a transição.

### RISCO CRÍTICO 2: Pedidos Existentes
**Descrição:** Pedidos referenciam `cliente_cpf` (FK).  
**Impacto:** Migração de FK pode causar perda de dados.  
**Mitigação:** Manter coluna antiga + criar nova FK em paralelo.

### RISCO ALTO 3: Cookies de Sessão
**Descrição:** Cookies existentes usam estrutura `{tipo, cpf, nome, email}`.  
**Impacto:** Usuários logados podem ter sessão corrompida.  
**Mitigação:** Manter compatibilidade com estrutura atual do cookie.

### RISCO ALTO 4: Frontend JavaScript
**Descrição:** Frontend usa campos como `cpf`, `nome` diretamente.  
**Impacto:** CRUD pode quebrar se campos mudarem nome.  
**Mitigação:** Backend retorna aliases temporariamente.

### RISCO MÉDIO 5: Integridade Referencial
**Descrição:** FKs entre tabelas durante migração.  
**Impacto:** INSERTS/UPDATES podem falhar.  
**Mitigação:** Usar transações e validar antes de cada operação.

---

# 🔧 FASE 1 — CRIAÇÃO DE NOVAS TABELAS

## Ordem de Criação (SEM alterar existentes)

### 1.1 Criar tabela `pessoa`
```sql
-- FASE 1.1: Criar tabela pessoa (superclasse)
CREATE TABLE IF NOT EXISTS pessoa (
  cpf_pessoa VARCHAR(14) PRIMARY KEY,
  nome_pessoa VARCHAR(100) NOT NULL,
  email_pessoa VARCHAR(100) NOT NULL UNIQUE,
  senha_pessoa VARCHAR(255) NOT NULL,
  primeiro_acesso_pessoa BOOLEAN DEFAULT true,
  data_nascimento DATE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pessoa_email ON pessoa(email_pessoa);
```

### 1.2 Criar tabela `cargo`
```sql
-- FASE 1.2: Criar tabela cargo
CREATE TABLE IF NOT EXISTS cargo (
  id_cargo SERIAL PRIMARY KEY,
  nome_cargo VARCHAR(50) NOT NULL UNIQUE
);

-- Inserir cargos padrão
INSERT INTO cargo (nome_cargo) VALUES 
  ('Gerente'),
  ('Gerente Master'),
  ('Vendedor'),
  ('Caixa'),
  ('Atendente'),
  ('Estoquista')
ON CONFLICT (nome_cargo) DO NOTHING;
```

### 1.3 Criar tabela `pagamento`
```sql
-- FASE 1.3: Criar tabela pagamento
CREATE TABLE IF NOT EXISTS pagamento (
  id_pagamento SERIAL PRIMARY KEY,
  data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT now(),
  pedido_id_pedido INT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pagamento_pedido ON pagamento(pedido_id_pedido);
```

### 1.4 Criar tabela `pagamento_has_forma_pagamento`
```sql
-- FASE 1.4: Criar tabela de relacionamento N:N
CREATE TABLE IF NOT EXISTS pagamento_has_forma_pagamento (
  pagamento_id_pagamento INT NOT NULL REFERENCES pagamento(id_pagamento) ON DELETE CASCADE,
  forma_pagamento_id_forma_pagamento INT NOT NULL REFERENCES forma_pagamento(id_forma_pagamento),
  valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (pagamento_id_pagamento, forma_pagamento_id_forma_pagamento)
);
```

---

# 🔄 FASE 2 — MIGRAÇÃO DE DADOS

## 2.1 Migrar Clientes para Pessoa

```sql
-- FASE 2.1: Migrar dados de cliente para pessoa
INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, primeiro_acesso_pessoa)
SELECT 
  cpf,
  nome,
  email,
  senha,
  false  -- já fizeram primeiro acesso
FROM cliente
ON CONFLICT (cpf_pessoa) DO NOTHING;
```

## 2.2 Migrar Funcionários para Pessoa

```sql
-- FASE 2.2: Migrar dados de funcionario para pessoa
INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, primeiro_acesso_pessoa)
SELECT 
  cpf,
  nome,
  email,
  senha,
  false
FROM funcionario
ON CONFLICT (cpf_pessoa) DO UPDATE SET
  nome_pessoa = EXCLUDED.nome_pessoa,
  email_pessoa = EXCLUDED.email_pessoa,
  senha_pessoa = EXCLUDED.senha_pessoa;
```

## 2.3 Adicionar Novas Colunas às Tabelas Existentes

```sql
-- FASE 2.3a: Adicionar colunas em cliente
ALTER TABLE cliente 
  ADD COLUMN IF NOT EXISTS renda_cliente NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS data_cadastro_cliente TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS pessoa_cpf_pessoa VARCHAR(14);

-- FASE 2.3b: Adicionar coluna FK pessoa em funcionario
ALTER TABLE funcionario
  ADD COLUMN IF NOT EXISTS pessoa_cpf_pessoa VARCHAR(14),
  ADD COLUMN IF NOT EXISTS cargo_id_cargo INT;

-- FASE 2.3c: Adicionar coluna funcionário em pedido
ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS funcionario_cpf VARCHAR(14);

-- FASE 2.3d: Renomear coluna em forma_pagamento
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='forma_pagamento' AND column_name='nome_forma') THEN
    ALTER TABLE forma_pagamento RENAME COLUMN nome_forma TO nome_forma_pagamento;
  END IF;
END $$;

-- FASE 2.3e: Renomear colunas em produto
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='produto' AND column_name='preco_produto') THEN
    ALTER TABLE produto RENAME COLUMN preco_produto TO preco_unitario_produto;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='produto' AND column_name='quantidade_estoque') THEN
    ALTER TABLE produto RENAME COLUMN quantidade_estoque TO quantidade_estoque_produto;
  END IF;
END $$;
```

## 2.4 Popular FK pessoa em cliente e funcionario

```sql
-- FASE 2.4a: Vincular cliente a pessoa
UPDATE cliente 
SET pessoa_cpf_pessoa = cpf
WHERE pessoa_cpf_pessoa IS NULL;

-- FASE 2.4b: Vincular funcionario a pessoa
UPDATE funcionario 
SET pessoa_cpf_pessoa = cpf
WHERE pessoa_cpf_pessoa IS NULL;

-- FASE 2.4c: Vincular funcionario a cargo (mapear cargo texto -> id)
UPDATE funcionario f
SET cargo_id_cargo = c.id_cargo
FROM cargo c
WHERE LOWER(f.cargo) = LOWER(c.nome_cargo)
  AND f.cargo_id_cargo IS NULL;
```

## 2.5 Criar Views de Compatibilidade

```sql
-- FASE 2.5: Views para manter compatibilidade com queries antigas

-- View cliente com campos novos E antigos
CREATE OR REPLACE VIEW v_cliente_compat AS
SELECT 
  c.cpf,
  c.cpf AS cliente_pessoa_cpf_pessoa,
  p.nome_pessoa AS nome,
  p.email_pessoa AS email,
  p.senha_pessoa AS senha,
  c.renda_cliente,
  c.data_cadastro_cliente,
  p.primeiro_acesso_pessoa,
  p.data_nascimento
FROM cliente c
JOIN pessoa p ON p.cpf_pessoa = c.cpf;

-- View funcionario com campos novos E antigos
CREATE OR REPLACE VIEW v_funcionario_compat AS
SELECT 
  f.cpf,
  f.cpf AS funcionario_pessoa_cpf_pessoa,
  p.nome_pessoa AS nome,
  p.email_pessoa AS email,
  p.senha_pessoa AS senha,
  f.cargo,
  cg.id_cargo AS cargo_id_cargo,
  cg.nome_cargo,
  f.salario,
  f.salario AS salario_funcionario,
  f.porcentagem_comissao,
  f.porcentagem_comissao AS porcentagem_comissao_funcionario,
  p.primeiro_acesso_pessoa,
  p.data_nascimento
FROM funcionario f
JOIN pessoa p ON p.cpf_pessoa = f.cpf
LEFT JOIN cargo cg ON cg.id_cargo = f.cargo_id_cargo;
```

---

# 🔧 FASE 3 — ADAPTAÇÃO DO BACKEND

## 3.1 Ordem de Modificação dos Controllers

| Ordem | Controller | Complexidade | Risco |
|-------|------------|--------------|-------|
| 1 | `pessoaController.js` | BAIXA | BAIXO |
| 2 | `cargoController.js` | BAIXA | BAIXO |
| 3 | `loginController.js` | ALTA | CRÍTICO |
| 4 | `clienteController.js` | ALTA | ALTO |
| 5 | `funcionarioController.js` | ALTA | ALTO |
| 6 | `pedidoController.js` | MÉDIA | MÉDIO |
| 7 | `produtoController.js` | BAIXA | BAIXO |
| 8 | `forma_pagamentoController.js` | BAIXA | BAIXO |

## 3.2 Estratégia de Compatibilidade

### Princípio: LEITURA DO MODELO ANTIGO, GRAVAÇÃO NO MODELO NOVO

```javascript
// EXEMPLO: clienteController.js - modo híbrido

// Listar usa view de compatibilidade
exports.listarClientes = async (req, res) => {
  // Usa view que retorna campos antigos E novos
  const result = await query('SELECT * FROM v_cliente_compat ORDER BY nome');
  res.json(result.rows);
};

// Criar grava em AMBAS as tabelas (pessoa + cliente)
exports.criarCliente = async (req, res) => {
  const { cpf, nome, email, senha, renda, data_nascimento } = req.body;
  
  await transaction(async (client) => {
    // 1. Insere em pessoa (nova estrutura)
    await client.query(`
      INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, data_nascimento)
      VALUES ($1, $2, $3, $4, $5)
    `, [cpf, nome, email, hashedSenha, data_nascimento]);
    
    // 2. Insere em cliente (mantém compatibilidade + novos campos)
    await client.query(`
      INSERT INTO cliente (cpf, nome, email, senha, pessoa_cpf_pessoa, renda_cliente)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [cpf, nome, email, hashedSenha, cpf, renda]);
  });
  
  res.status(201).json({ cpf, nome, email });
};
```

## 3.3 Modificações no Login (CRÍTICO)

```javascript
// loginController.js - MODO COMPATÍVEL

// Login universal deve funcionar com modelo antigo E novo
exports.loginUniversal = async (req, res) => {
  const { email, senha } = req.body;
  
  // 1. Tentar buscar em pessoa (novo modelo)
  let usuario = await buscarEmPessoa(email, senha);
  
  if (!usuario) {
    // 2. Fallback: buscar no modelo antigo
    usuario = await buscarEmClienteOuFuncionario(email, senha);
  }
  
  if (!usuario) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  
  // Cookie mantém estrutura atual para não quebrar frontend
  const cookieData = {
    tipo: usuario.tipo,
    cpf: usuario.cpf,
    nome: usuario.nome,
    email: usuario.email
  };
  
  res.cookie('usuario', JSON.stringify(cookieData), cookieOpts);
  res.json({ status: 'ok', usuario: cookieData });
};
```

---

# 🎨 FASE 4 — ATUALIZAÇÃO DO FRONTEND

## 4.1 CRUDs a Atualizar

| CRUD | Arquivo HTML | Arquivo JS | Mudanças |
|------|--------------|------------|----------|
| Cliente | `cliente/cliente.html` | `cliente/cliente.js` | Adicionar campos renda, data_nascimento |
| Funcionário | `funcionario/funcionario.html` | - (inline) | Adicionar select de cargo (da tabela) |

## 4.2 Princípio de Atualização Frontend

**NÃO MUDAR** nomes de campos na API response:
- Frontend espera `cpf`, não `cliente_pessoa_cpf_pessoa`
- Frontend espera `nome`, não `nome_pessoa`
- Backend faz o mapeamento internamente

## 4.3 Mudanças Mínimas no Frontend

### Cliente - Adicionar campos opcionais:
```html
<!-- cliente.html - adicionar ao form -->
<div class="field">
  <label for="renda">Renda Mensal</label>
  <input id="renda" name="renda" type="number" step="0.01" min="0" />
</div>
<div class="field">
  <label for="data_nascimento">Data de Nascimento</label>
  <input id="data_nascimento" name="data_nascimento" type="date" />
</div>
```

### Funcionário - Mudar cargo de texto para select:
```html
<!-- funcionario.html - trocar input por select dinâmico -->
<label>Cargo
  <select id="cargo" name="cargo_id_cargo" required>
    <!-- Populado via JS da rota /cargo -->
  </select>
</label>
```

---

# 🧹 FASE 5 — REMOÇÃO DE CÓDIGO LEGADO

## 5.1 Checklist Pré-Remoção

- [ ] Todos os testes passando
- [ ] Login funcionando para cliente e funcionário
- [ ] CRUD cliente funcionando (criar, editar, excluir)
- [ ] CRUD funcionário funcionando (criar, editar, excluir)
- [ ] Pedidos sendo criados corretamente
- [ ] Carrinho de compras funcionando
- [ ] Pagamentos sendo registrados (se implementado)

## 5.2 Remoções a Fazer (SOMENTE APÓS VALIDAÇÃO)

```sql
-- FASE 5: Limpeza (EXECUTAR APENAS APÓS TUDO FUNCIONANDO)

-- 5.1 Remover colunas redundantes de cliente
ALTER TABLE cliente DROP COLUMN IF EXISTS nome;
ALTER TABLE cliente DROP COLUMN IF EXISTS email;
ALTER TABLE cliente DROP COLUMN IF EXISTS senha;

-- 5.2 Remover colunas redundantes de funcionario
ALTER TABLE funcionario DROP COLUMN IF EXISTS nome;
ALTER TABLE funcionario DROP COLUMN IF EXISTS email;
ALTER TABLE funcionario DROP COLUMN IF EXISTS senha;
ALTER TABLE funcionario DROP COLUMN IF EXISTS cargo;  -- usar cargo_id_cargo

-- 5.3 Renomear PK de cliente
-- (requer recriação da tabela - fazer com cuidado)
-- ALTER TABLE cliente RENAME COLUMN cpf TO cliente_pessoa_cpf_pessoa;

-- 5.4 Renomear PK de funcionario
-- (requer recriação da tabela - fazer com cuidado)
-- ALTER TABLE funcionario RENAME COLUMN cpf TO funcionario_pessoa_cpf_pessoa;

-- 5.5 Remover views de compatibilidade
DROP VIEW IF EXISTS v_cliente_compat;
DROP VIEW IF EXISTS v_funcionario_compat;
```

---

# ✅ CHECKLIST FINAL DE COMPATIBILIDADE

## Banco de Dados
- [ ] Tabela `pessoa` criada e populada
- [ ] Tabela `cargo` criada e populada
- [ ] Tabela `pagamento` criada
- [ ] Tabela `pagamento_has_forma_pagamento` criada
- [ ] FK `pessoa_cpf_pessoa` adicionada em cliente
- [ ] FK `pessoa_cpf_pessoa` adicionada em funcionario
- [ ] FK `cargo_id_cargo` adicionada em funcionario
- [ ] Coluna `funcionario_cpf` adicionada em pedido
- [ ] Views de compatibilidade funcionando

## Backend
- [ ] `pessoaController.js` usa tabela `pessoa`
- [ ] `cargoController.js` usa tabela `cargo`
- [ ] `loginController.js` consulta `pessoa` E tabelas antigas
- [ ] `clienteController.js` grava em `pessoa` + `cliente`
- [ ] `funcionarioController.js` grava em `pessoa` + `funcionario`
- [ ] `pedidoController.js` aceita `funcionario_cpf`
- [ ] API responses mantêm nomes de campos antigos

## Frontend
- [ ] CRUD cliente exibe campos novos (renda, data_nascimento)
- [ ] CRUD funcionário usa select de cargo dinâmico
- [ ] Login funciona para ambos tipos
- [ ] Carrinho/compras funcionando

## Sistema Completo
- [ ] Nenhum erro 400 ou 404 inesperado
- [ ] Dados antigos preservados
- [ ] Novos registros seguem modelo do professor
- [ ] Performance aceitável

---

# 📁 ARQUIVOS A MODIFICAR (RESUMO)

## Backend
| Arquivo | Tipo de Mudança |
|---------|----------------|
| `controllers/pessoaController.js` | Reescrever para usar tabela pessoa |
| `controllers/cargoController.js` | Reescrever para usar tabela cargo |
| `controllers/clienteController.js` | Modo híbrido (pessoa + cliente) |
| `controllers/funcionarioController.js` | Modo híbrido (pessoa + funcionario) |
| `controllers/loginController.js` | Consultar pessoa + fallback |
| `controllers/pedidoController.js` | Adicionar funcionário |
| `controllers/produtoController.js` | Renomear colunas |
| `controllers/forma_pagamentoController.js` | Renomear coluna |

## Frontend
| Arquivo | Tipo de Mudança |
|---------|----------------|
| `frontend/cliente/cliente.html` | Adicionar campos |
| `frontend/cliente/cliente.js` | Enviar novos campos |
| `frontend/funcionario/funcionario.html` | Select dinâmico de cargo |

## SQL
| Arquivo | Conteúdo |
|---------|----------|
| `documentacao/migracao_fase1.sql` | Criação de tabelas |
| `documentacao/migracao_fase2.sql` | Migração de dados |
| `documentacao/migracao_fase5.sql` | Limpeza final |

---

# 🎯 PRÓXIMOS PASSOS

Confirme se deseja que eu:

1. **Gere o SQL completo da Fase 1** (criação de tabelas)
2. **Gere o SQL completo da Fase 2** (migração de dados)
3. **Modifique os controllers** (modo compatibilidade)
4. **Modifique o frontend** (novos campos)
5. **Execute uma fase específica**

⚠️ **IMPORTANTE:** Cada fase deve ser testada antes de avançar para a próxima!
