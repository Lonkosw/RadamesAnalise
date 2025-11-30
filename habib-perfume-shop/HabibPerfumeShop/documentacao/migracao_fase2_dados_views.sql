-- ============================================================================
-- MIGRAÇÃO FASE 2 - MIGRAÇÃO DE DADOS + VIEWS DE COMPATIBILIDADE
-- ============================================================================
-- Data: 27/11/2025
-- Objetivo: Migrar dados existentes para o novo modelo SEM quebrar o sistema
-- Segurança: Dados originais são PRESERVADOS, apenas copiados para pessoa
-- ============================================================================

-- ============================================================================
-- PARTE A: VERIFICAÇÃO PRÉ-MIGRAÇÃO
-- ============================================================================

DO $$
DECLARE
  qtd_clientes INT;
  qtd_funcionarios INT;
  qtd_emails_duplicados INT;
BEGIN
  -- Contar registros atuais
  SELECT COUNT(*) INTO qtd_clientes FROM cliente;
  SELECT COUNT(*) INTO qtd_funcionarios FROM funcionario;
  
  RAISE NOTICE '📊 PRÉ-MIGRAÇÃO:';
  RAISE NOTICE '   - Clientes encontrados: %', qtd_clientes;
  RAISE NOTICE '   - Funcionários encontrados: %', qtd_funcionarios;
  
  -- Verificar se há emails duplicados entre cliente e funcionário
  SELECT COUNT(*) INTO qtd_emails_duplicados
  FROM cliente c
  INNER JOIN funcionario f ON c.email = f.email;
  
  IF qtd_emails_duplicados > 0 THEN
    RAISE WARNING '⚠️ ATENÇÃO: % email(s) duplicado(s) entre cliente e funcionário!', qtd_emails_duplicados;
    RAISE NOTICE '   Esses casos serão tratados: funcionário terá prioridade';
  ELSE
    RAISE NOTICE '   ✅ Nenhum email duplicado entre cliente e funcionário';
  END IF;
END $$;

-- ============================================================================
-- PARTE B: MIGRAR DADOS DE FUNCIONÁRIO PARA PESSOA (primeiro - têm prioridade)
-- ============================================================================
-- Funcionários são migrados primeiro porque:
-- 1. Incluem o Gerente Master que é crítico para o sistema
-- 2. Se houver email duplicado, funcionário tem prioridade

INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, primeiro_acesso_pessoa)
SELECT 
  TRIM(cpf),           -- Remove espaços (CHAR pode ter padding)
  nome,
  email,
  senha,
  false                -- Já fizeram primeiro acesso
FROM funcionario
ON CONFLICT (cpf_pessoa) DO UPDATE SET
  nome_pessoa = EXCLUDED.nome_pessoa,
  email_pessoa = EXCLUDED.email_pessoa,
  senha_pessoa = EXCLUDED.senha_pessoa;

DO $$ BEGIN RAISE NOTICE '✅ Funcionários migrados para tabela PESSOA'; END $$;

-- ============================================================================
-- PARTE C: MIGRAR DADOS DE CLIENTE PARA PESSOA
-- ============================================================================
-- Clientes são migrados depois
-- Se email já existir (de funcionário), o cliente NÃO será inserido em pessoa
-- mas mantemos os dados na tabela cliente original

INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, primeiro_acesso_pessoa)
SELECT 
  TRIM(cpf),
  nome,
  email,
  senha,
  false
FROM cliente c
WHERE NOT EXISTS (
  -- Não inserir se o email já existe em pessoa (funcionário)
  SELECT 1 FROM pessoa p WHERE p.email_pessoa = c.email
)
ON CONFLICT (cpf_pessoa) DO UPDATE SET
  nome_pessoa = EXCLUDED.nome_pessoa,
  senha_pessoa = EXCLUDED.senha_pessoa;
  -- Não atualiza email para evitar conflito de UNIQUE

DO $$ BEGIN RAISE NOTICE '✅ Clientes migrados para tabela PESSOA'; END $$;

-- ============================================================================
-- PARTE D: ADICIONAR NOVAS COLUNAS ÀS TABELAS EXISTENTES
-- ============================================================================
-- Estas colunas são NULLABLE para não quebrar o sistema atual
-- Serão populadas em seguida

-- D.1: Colunas em CLIENTE
ALTER TABLE cliente 
  ADD COLUMN IF NOT EXISTS pessoa_cpf_pessoa VARCHAR(14),
  ADD COLUMN IF NOT EXISTS renda_cliente NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS data_cadastro_cliente TIMESTAMP WITH TIME ZONE DEFAULT now();

DO $$ BEGIN RAISE NOTICE '✅ Colunas adicionadas em CLIENTE: pessoa_cpf_pessoa, renda_cliente, data_cadastro_cliente'; END $$;

-- D.2: Colunas em FUNCIONARIO
ALTER TABLE funcionario
  ADD COLUMN IF NOT EXISTS pessoa_cpf_pessoa VARCHAR(14),
  ADD COLUMN IF NOT EXISTS cargo_id_cargo INT;

DO $$ BEGIN RAISE NOTICE '✅ Colunas adicionadas em FUNCIONARIO: pessoa_cpf_pessoa, cargo_id_cargo'; END $$;

-- D.3: Coluna em PEDIDO (funcionário responsável)
ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS funcionario_cpf CHAR(11);

DO $$ BEGIN RAISE NOTICE '✅ Coluna adicionada em PEDIDO: funcionario_cpf'; END $$;

-- ============================================================================
-- PARTE E: POPULAR AS NOVAS COLUNAS (FK para pessoa)
-- ============================================================================

-- E.1: Vincular cliente a pessoa
UPDATE cliente 
SET pessoa_cpf_pessoa = TRIM(cpf)
WHERE pessoa_cpf_pessoa IS NULL;

DO $$ BEGIN RAISE NOTICE '✅ CLIENTE.pessoa_cpf_pessoa populado'; END $$;

-- E.2: Vincular funcionario a pessoa
UPDATE funcionario 
SET pessoa_cpf_pessoa = TRIM(cpf)
WHERE pessoa_cpf_pessoa IS NULL;

DO $$ BEGIN RAISE NOTICE '✅ FUNCIONARIO.pessoa_cpf_pessoa populado'; END $$;

-- E.3: Vincular funcionario a cargo (mapear cargo texto -> id)
UPDATE funcionario f
SET cargo_id_cargo = c.id_cargo
FROM cargo c
WHERE LOWER(TRIM(f.cargo)) = LOWER(c.nome_cargo)
  AND f.cargo_id_cargo IS NULL;

-- Inserir cargos que não existem ainda (se houver algum cargo customizado)
INSERT INTO cargo (nome_cargo)
SELECT DISTINCT TRIM(cargo) 
FROM funcionario 
WHERE cargo IS NOT NULL 
  AND TRIM(cargo) <> ''
  AND NOT EXISTS (SELECT 1 FROM cargo c WHERE LOWER(c.nome_cargo) = LOWER(TRIM(funcionario.cargo)))
ON CONFLICT (nome_cargo) DO NOTHING;

-- Atualizar novamente para pegar os cargos recém-inseridos
UPDATE funcionario f
SET cargo_id_cargo = c.id_cargo
FROM cargo c
WHERE LOWER(TRIM(f.cargo)) = LOWER(c.nome_cargo)
  AND f.cargo_id_cargo IS NULL;

DO $$ BEGIN RAISE NOTICE '✅ FUNCIONARIO.cargo_id_cargo populado'; END $$;

-- ============================================================================
-- PARTE F: CRIAR FOREIGN KEYS (opcional - sem NOT VALID para não falhar)
-- ============================================================================
-- Criamos as FKs mas permitimos valores NULL (não são obrigatórias ainda)

-- FK cliente -> pessoa (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_cliente_pessoa' AND table_name = 'cliente'
  ) THEN
    ALTER TABLE cliente 
      ADD CONSTRAINT fk_cliente_pessoa 
      FOREIGN KEY (pessoa_cpf_pessoa) 
      REFERENCES pessoa(cpf_pessoa) 
      ON DELETE SET NULL;
    RAISE NOTICE '✅ FK cliente -> pessoa criada';
  ELSE
    RAISE NOTICE '⏭️ FK cliente -> pessoa já existe';
  END IF;
END $$;

-- FK funcionario -> pessoa (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_funcionario_pessoa' AND table_name = 'funcionario'
  ) THEN
    ALTER TABLE funcionario 
      ADD CONSTRAINT fk_funcionario_pessoa 
      FOREIGN KEY (pessoa_cpf_pessoa) 
      REFERENCES pessoa(cpf_pessoa) 
      ON DELETE SET NULL;
    RAISE NOTICE '✅ FK funcionario -> pessoa criada';
  ELSE
    RAISE NOTICE '⏭️ FK funcionario -> pessoa já existe';
  END IF;
END $$;

-- FK funcionario -> cargo (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_funcionario_cargo' AND table_name = 'funcionario'
  ) THEN
    ALTER TABLE funcionario 
      ADD CONSTRAINT fk_funcionario_cargo 
      FOREIGN KEY (cargo_id_cargo) 
      REFERENCES cargo(id_cargo) 
      ON DELETE SET NULL;
    RAISE NOTICE '✅ FK funcionario -> cargo criada';
  ELSE
    RAISE NOTICE '⏭️ FK funcionario -> cargo já existe';
  END IF;
END $$;

-- FK pedido -> funcionario (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_pedido_funcionario' AND table_name = 'pedido'
  ) THEN
    ALTER TABLE pedido 
      ADD CONSTRAINT fk_pedido_funcionario 
      FOREIGN KEY (funcionario_cpf) 
      REFERENCES funcionario(cpf) 
      ON DELETE SET NULL;
    RAISE NOTICE '✅ FK pedido -> funcionario criada';
  ELSE
    RAISE NOTICE '⏭️ FK pedido -> funcionario já existe';
  END IF;
END $$;

-- ============================================================================
-- PARTE G: CRIAR VIEWS DE COMPATIBILIDADE
-- ============================================================================
-- Estas views permitem que o sistema continue funcionando sem alterações
-- nos controllers, retornando dados no formato antigo (cpf, nome, email)

-- G.1: View de cliente compatível
CREATE OR REPLACE VIEW v_cliente_compat AS
SELECT 
  c.cpf,
  c.cpf AS cliente_pessoa_cpf_pessoa,
  COALESCE(p.nome_pessoa, c.nome) AS nome,
  COALESCE(p.email_pessoa, c.email) AS email,
  COALESCE(p.senha_pessoa, c.senha) AS senha,
  c.renda_cliente,
  c.data_cadastro_cliente,
  p.primeiro_acesso_pessoa,
  p.data_nascimento
FROM cliente c
LEFT JOIN pessoa p ON p.cpf_pessoa = TRIM(c.cpf);

COMMENT ON VIEW v_cliente_compat IS 'View de compatibilidade: retorna dados de cliente no formato antigo + novos campos';

DO $$ BEGIN RAISE NOTICE '✅ VIEW v_cliente_compat criada'; END $$;

-- G.2: View de funcionário compatível
CREATE OR REPLACE VIEW v_funcionario_compat AS
SELECT 
  f.cpf,
  f.cpf AS funcionario_pessoa_cpf_pessoa,
  COALESCE(p.nome_pessoa, f.nome) AS nome,
  COALESCE(p.email_pessoa, f.email) AS email,
  COALESCE(p.senha_pessoa, f.senha) AS senha,
  f.cargo,
  f.cargo_id_cargo,
  cg.nome_cargo,
  f.salario,
  f.salario AS salario_funcionario,
  f.porcentagem_comissao,
  f.porcentagem_comissao AS porcentagem_comissao_funcionario,
  p.primeiro_acesso_pessoa,
  p.data_nascimento
FROM funcionario f
LEFT JOIN pessoa p ON p.cpf_pessoa = TRIM(f.cpf)
LEFT JOIN cargo cg ON cg.id_cargo = f.cargo_id_cargo;

COMMENT ON VIEW v_funcionario_compat IS 'View de compatibilidade: retorna dados de funcionário no formato antigo + novos campos';

DO $$ BEGIN RAISE NOTICE '✅ VIEW v_funcionario_compat criada'; END $$;

-- G.3: View de pedido com funcionário
CREATE OR REPLACE VIEW v_pedido_completo AS
SELECT 
  p.id_pedido,
  p.data_pedido,
  p.cliente_cpf,
  c.nome AS cliente_nome,
  p.funcionario_cpf,
  f.nome AS funcionario_nome,
  COALESCE(SUM(php.quantidade * php.preco_unitario), 0) AS total
FROM pedido p
LEFT JOIN cliente c ON c.cpf = p.cliente_cpf
LEFT JOIN funcionario f ON f.cpf = p.funcionario_cpf
LEFT JOIN pedido_has_produto php ON php.pedido_id_pedido = p.id_pedido
GROUP BY p.id_pedido, p.data_pedido, p.cliente_cpf, c.nome, p.funcionario_cpf, f.nome;

COMMENT ON VIEW v_pedido_completo IS 'View de pedido com dados do cliente e funcionário responsável';

DO $$ BEGIN RAISE NOTICE '✅ VIEW v_pedido_completo criada'; END $$;

-- ============================================================================
-- PARTE H: VERIFICAÇÃO PÓS-MIGRAÇÃO
-- ============================================================================

DO $$
DECLARE
  qtd_pessoa INT;
  qtd_cliente_vinculado INT;
  qtd_funcionario_vinculado INT;
  qtd_funcionario_com_cargo INT;
  qtd_cargos INT;
BEGIN
  -- Contagens
  SELECT COUNT(*) INTO qtd_pessoa FROM pessoa;
  SELECT COUNT(*) INTO qtd_cliente_vinculado FROM cliente WHERE pessoa_cpf_pessoa IS NOT NULL;
  SELECT COUNT(*) INTO qtd_funcionario_vinculado FROM funcionario WHERE pessoa_cpf_pessoa IS NOT NULL;
  SELECT COUNT(*) INTO qtd_funcionario_com_cargo FROM funcionario WHERE cargo_id_cargo IS NOT NULL;
  SELECT COUNT(*) INTO qtd_cargos FROM cargo;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RESULTADO DA MIGRAÇÃO - FASE 2';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Registros em PESSOA: %', qtd_pessoa;
  RAISE NOTICE '✅ Clientes vinculados a PESSOA: %', qtd_cliente_vinculado;
  RAISE NOTICE '✅ Funcionários vinculados a PESSOA: %', qtd_funcionario_vinculado;
  RAISE NOTICE '✅ Funcionários com CARGO vinculado: %', qtd_funcionario_com_cargo;
  RAISE NOTICE '✅ Total de cargos cadastrados: %', qtd_cargos;
  RAISE NOTICE '';
  RAISE NOTICE '📋 VIEWS CRIADAS:';
  RAISE NOTICE '   - v_cliente_compat (compatibilidade cliente)';
  RAISE NOTICE '   - v_funcionario_compat (compatibilidade funcionário)';
  RAISE NOTICE '   - v_pedido_completo (pedido com funcionário)';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FASE 2 CONCLUÍDA - Sistema continua funcionando normalmente!';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- TESTES DE VERIFICAÇÃO (executar manualmente se quiser)
-- ============================================================================
-- Descomente para testar:

-- Teste 1: Ver dados na view de cliente
-- SELECT * FROM v_cliente_compat LIMIT 5;

-- Teste 2: Ver dados na view de funcionário
-- SELECT * FROM v_funcionario_compat LIMIT 5;

-- Teste 3: Ver dados na tabela pessoa
-- SELECT * FROM pessoa;

-- Teste 4: Ver cargos
-- SELECT * FROM cargo ORDER BY id_cargo;

-- Teste 5: Verificar se login ainda funciona (simular busca)
-- SELECT cpf, nome, email FROM cliente WHERE email = 'ana.silva@email.com';
-- SELECT cpf, nome, cargo, email FROM funcionario WHERE email = 'marcos.pereira@empresa.com';

-- ============================================================================
-- FIM DA FASE 2
-- ============================================================================
-- Próximo passo: Fase 3 - Adaptar controllers para modo compatibilidade
-- O sistema atual continua funcionando normalmente!
-- ============================================================================
