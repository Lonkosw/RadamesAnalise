-- ============================================================================
-- MIGRAÇÃO FASE 1 - CRIAÇÃO DE NOVAS TABELAS
-- ============================================================================
-- Data: 27/11/2025
-- Objetivo: Criar tabelas do modelo do professor SEM alterar tabelas existentes
-- Segurança: Usa IF NOT EXISTS para evitar erros em execução repetida
-- ============================================================================

-- ============================================================================
-- 1. TABELA PESSOA (Superclasse para Cliente e Funcionário)
-- ============================================================================
-- Esta tabela armazena os dados comuns de todas as pessoas do sistema
-- No modelo do professor, cliente e funcionário herdam de pessoa

CREATE TABLE IF NOT EXISTS pessoa (
  cpf_pessoa VARCHAR(14) PRIMARY KEY,
  nome_pessoa VARCHAR(100) NOT NULL,
  email_pessoa VARCHAR(100) NOT NULL,
  senha_pessoa VARCHAR(255) NOT NULL,
  primeiro_acesso_pessoa BOOLEAN DEFAULT true,
  data_nascimento DATE,
  
  -- Constraint para garantir email único
  CONSTRAINT uk_pessoa_email UNIQUE (email_pessoa)
);

-- Índice para buscas por email (usado no login)
CREATE INDEX IF NOT EXISTS idx_pessoa_email ON pessoa(email_pessoa);

-- Índice para buscas por nome
CREATE INDEX IF NOT EXISTS idx_pessoa_nome ON pessoa(nome_pessoa);

COMMENT ON TABLE pessoa IS 'Superclasse que armazena dados comuns de clientes e funcionários - Modelo do Professor';
COMMENT ON COLUMN pessoa.cpf_pessoa IS 'CPF da pessoa (chave primária)';
COMMENT ON COLUMN pessoa.nome_pessoa IS 'Nome completo da pessoa';
COMMENT ON COLUMN pessoa.email_pessoa IS 'Email único para login';
COMMENT ON COLUMN pessoa.senha_pessoa IS 'Senha com hash bcrypt';
COMMENT ON COLUMN pessoa.primeiro_acesso_pessoa IS 'Indica se é o primeiro acesso (para forçar troca de senha)';
COMMENT ON COLUMN pessoa.data_nascimento IS 'Data de nascimento';

-- ============================================================================
-- 2. TABELA CARGO (Normalização de cargos de funcionários)
-- ============================================================================
-- No modelo atual, cargo é uma string livre no funcionário
-- No modelo do professor, cargo é uma tabela separada (normalizada)

CREATE TABLE IF NOT EXISTS cargo (
  id_cargo SERIAL PRIMARY KEY,
  nome_cargo VARCHAR(50) NOT NULL,
  
  -- Constraint para garantir nome único
  CONSTRAINT uk_cargo_nome UNIQUE (nome_cargo)
);

COMMENT ON TABLE cargo IS 'Tabela de cargos para funcionários - Normalização conforme modelo do professor';
COMMENT ON COLUMN cargo.id_cargo IS 'ID único do cargo (auto-incremento)';
COMMENT ON COLUMN cargo.nome_cargo IS 'Nome do cargo (único)';

-- Inserir cargos padrão (os mesmos que já existem no sistema + Gerente Master)
-- ON CONFLICT garante que não haverá erro se executado novamente
INSERT INTO cargo (nome_cargo) VALUES 
  ('Gerente'),
  ('Gerente Master'),
  ('Vendedor'),
  ('Caixa'),
  ('Atendente'),
  ('Estoquista')
ON CONFLICT (nome_cargo) DO NOTHING;

-- ============================================================================
-- 3. TABELA PAGAMENTO (Registro de pagamentos de pedidos)
-- ============================================================================
-- No modelo atual, não existe tabela de pagamento
-- No modelo do professor, pagamento é separado do pedido

CREATE TABLE IF NOT EXISTS pagamento (
  id_pagamento SERIAL PRIMARY KEY,
  data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT now(),
  pedido_id_pedido INT NOT NULL,
  
  -- Foreign key para pedido (já existe no sistema)
  CONSTRAINT fk_pagamento_pedido 
    FOREIGN KEY (pedido_id_pedido) 
    REFERENCES pedido(id_pedido) 
    ON DELETE CASCADE
);

-- Índice para buscas por pedido
CREATE INDEX IF NOT EXISTS idx_pagamento_pedido ON pagamento(pedido_id_pedido);

-- Índice para buscas por data
CREATE INDEX IF NOT EXISTS idx_pagamento_data ON pagamento(data_pagamento);

COMMENT ON TABLE pagamento IS 'Registro de pagamentos realizados para pedidos - Modelo do Professor';
COMMENT ON COLUMN pagamento.id_pagamento IS 'ID único do pagamento (auto-incremento)';
COMMENT ON COLUMN pagamento.data_pagamento IS 'Data e hora do pagamento';
COMMENT ON COLUMN pagamento.pedido_id_pedido IS 'ID do pedido pago (FK)';

-- ============================================================================
-- 4. TABELA PAGAMENTO_HAS_FORMA_PAGAMENTO (Relacionamento N:N)
-- ============================================================================
-- No modelo do professor, um pagamento pode usar múltiplas formas de pagamento
-- Ex: parte em PIX, parte em cartão

CREATE TABLE IF NOT EXISTS pagamento_has_forma_pagamento (
  pagamento_id_pagamento INT NOT NULL,
  forma_pagamento_id_forma_pagamento INT NOT NULL,
  valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Chave primária composta
  PRIMARY KEY (pagamento_id_pagamento, forma_pagamento_id_forma_pagamento),
  
  -- Foreign keys
  CONSTRAINT fk_phfp_pagamento 
    FOREIGN KEY (pagamento_id_pagamento) 
    REFERENCES pagamento(id_pagamento) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_phfp_forma_pagamento 
    FOREIGN KEY (forma_pagamento_id_forma_pagamento) 
    REFERENCES forma_pagamento(id_forma_pagamento) 
    ON DELETE RESTRICT,
    
  -- Valor deve ser positivo
  CONSTRAINT chk_valor_pago_positivo CHECK (valor_pago >= 0)
);

-- Índices para consultas
CREATE INDEX IF NOT EXISTS idx_phfp_pagamento ON pagamento_has_forma_pagamento(pagamento_id_pagamento);
CREATE INDEX IF NOT EXISTS idx_phfp_forma ON pagamento_has_forma_pagamento(forma_pagamento_id_forma_pagamento);

COMMENT ON TABLE pagamento_has_forma_pagamento IS 'Relacionamento N:N entre pagamento e forma de pagamento - Modelo do Professor';
COMMENT ON COLUMN pagamento_has_forma_pagamento.pagamento_id_pagamento IS 'ID do pagamento (FK)';
COMMENT ON COLUMN pagamento_has_forma_pagamento.forma_pagamento_id_forma_pagamento IS 'ID da forma de pagamento (FK)';
COMMENT ON COLUMN pagamento_has_forma_pagamento.valor_pago IS 'Valor pago nesta forma específica';

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Query para verificar se as tabelas foram criadas corretamente

DO $$
DECLARE
  tabela_existe BOOLEAN;
BEGIN
  -- Verificar pessoa
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pessoa') INTO tabela_existe;
  IF tabela_existe THEN
    RAISE NOTICE '✅ Tabela PESSOA criada com sucesso';
  ELSE
    RAISE WARNING '❌ Tabela PESSOA não foi criada';
  END IF;
  
  -- Verificar cargo
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cargo') INTO tabela_existe;
  IF tabela_existe THEN
    RAISE NOTICE '✅ Tabela CARGO criada com sucesso';
  ELSE
    RAISE WARNING '❌ Tabela CARGO não foi criada';
  END IF;
  
  -- Verificar pagamento
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pagamento') INTO tabela_existe;
  IF tabela_existe THEN
    RAISE NOTICE '✅ Tabela PAGAMENTO criada com sucesso';
  ELSE
    RAISE WARNING '❌ Tabela PAGAMENTO não foi criada';
  END IF;
  
  -- Verificar pagamento_has_forma_pagamento
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pagamento_has_forma_pagamento') INTO tabela_existe;
  IF tabela_existe THEN
    RAISE NOTICE '✅ Tabela PAGAMENTO_HAS_FORMA_PAGAMENTO criada com sucesso';
  ELSE
    RAISE WARNING '❌ Tabela PAGAMENTO_HAS_FORMA_PAGAMENTO não foi criada';
  END IF;
  
  -- Contar cargos inseridos
  RAISE NOTICE '📊 Cargos inseridos: %', (SELECT COUNT(*) FROM cargo);
END $$;

-- ============================================================================
-- FIM DA FASE 1
-- ============================================================================
-- Próximo passo: Fase 2 - Migração de dados
-- Após executar este script, o sistema atual continua funcionando normalmente
-- As novas tabelas estarão vazias (exceto cargo que tem dados padrão)
-- ============================================================================
