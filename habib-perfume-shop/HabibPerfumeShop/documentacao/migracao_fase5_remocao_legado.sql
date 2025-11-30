-- =============================================================================
-- FASE 5: REMOÇÃO DE CÓDIGO LEGADO
-- =============================================================================
-- ATENÇÃO: Esta migração remove colunas duplicadas das tabelas cliente e funcionario
-- As colunas nome, email e senha agora existem apenas na tabela pessoa
-- EXECUTE SOMENTE APÓS CONFIRMAR QUE TUDO ESTÁ FUNCIONANDO!
-- =============================================================================

-- 1. Garantir que todos os registros em cliente e funcionario têm pessoa_cpf_pessoa preenchido
DO $$
DECLARE
    clientes_sem_pessoa INT;
    funcionarios_sem_pessoa INT;
BEGIN
    SELECT COUNT(*) INTO clientes_sem_pessoa FROM cliente WHERE pessoa_cpf_pessoa IS NULL;
    SELECT COUNT(*) INTO funcionarios_sem_pessoa FROM funcionario WHERE pessoa_cpf_pessoa IS NULL;
    
    IF clientes_sem_pessoa > 0 OR funcionarios_sem_pessoa > 0 THEN
        RAISE EXCEPTION 'Existem % clientes e % funcionários sem vínculo com pessoa. Execute a FASE 2 primeiro.', 
            clientes_sem_pessoa, funcionarios_sem_pessoa;
    END IF;
    
    RAISE NOTICE 'Verificação OK: Todos os registros estão vinculados à tabela pessoa.';
END $$;

-- 2. Remover TODAS as views que dependem das colunas antigas
DROP VIEW IF EXISTS v_pedido_completo CASCADE;
DROP VIEW IF EXISTS v_cliente_compat CASCADE;
DROP VIEW IF EXISTS v_funcionario_compat CASCADE;

-- 3. Remover colunas duplicadas da tabela CLIENTE
-- (nome, email, senha agora vêm de pessoa)
ALTER TABLE cliente DROP COLUMN IF EXISTS nome;
ALTER TABLE cliente DROP COLUMN IF EXISTS email;
ALTER TABLE cliente DROP COLUMN IF EXISTS senha;

-- 4. Remover colunas duplicadas da tabela FUNCIONARIO
-- (nome, email, senha agora vêm de pessoa)
ALTER TABLE funcionario DROP COLUMN IF EXISTS nome;
ALTER TABLE funcionario DROP COLUMN IF EXISTS email;
ALTER TABLE funcionario DROP COLUMN IF EXISTS senha;

-- 5. Tornar pessoa_cpf_pessoa obrigatório (NOT NULL)
ALTER TABLE cliente ALTER COLUMN pessoa_cpf_pessoa SET NOT NULL;
ALTER TABLE funcionario ALTER COLUMN pessoa_cpf_pessoa SET NOT NULL;

-- 6. Recriar as views usando APENAS a tabela pessoa
CREATE VIEW v_cliente_compat AS
SELECT 
    p.cpf_pessoa AS cpf,
    p.nome_pessoa AS nome,
    p.email_pessoa AS email,
    c.renda_cliente,
    c.data_cadastro_cliente,
    p.data_nascimento
FROM cliente c
JOIN pessoa p ON c.pessoa_cpf_pessoa = p.cpf_pessoa;

CREATE VIEW v_funcionario_compat AS
SELECT 
    p.cpf_pessoa AS cpf,
    p.nome_pessoa AS nome,
    f.cargo,
    f.salario,
    f.porcentagem_comissao,
    p.email_pessoa AS email,
    f.cargo_id_cargo,
    cg.nome_cargo,
    p.data_nascimento
FROM funcionario f
JOIN pessoa p ON f.pessoa_cpf_pessoa = p.cpf_pessoa
LEFT JOIN cargo cg ON f.cargo_id_cargo = cg.id_cargo;

-- 7. Recriar v_pedido_completo usando pessoa para obter nome do cliente
-- Nota: usa apenas colunas que existem na tabela pedido
CREATE VIEW v_pedido_completo AS
SELECT 
    p.id_pedido,
    p.data_pedido,
    p.cliente_cpf,
    pc.nome_pessoa AS cliente_nome,
    pc.email_pessoa AS cliente_email,
    COALESCE(
        (SELECT SUM(php.quantidade * php.preco_unitario) 
         FROM pedido_has_produto php 
         WHERE php.pedido_id_pedido = p.id_pedido), 0
    ) AS total
FROM pedido p
LEFT JOIN pessoa pc ON p.cliente_cpf = pc.cpf_pessoa;

-- 8. Verificação final
DO $$
DECLARE
    cliente_cols TEXT;
    funcionario_cols TEXT;
BEGIN
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO cliente_cols
    FROM information_schema.columns 
    WHERE table_name = 'cliente' AND table_schema = 'public';
    
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO funcionario_cols
    FROM information_schema.columns 
    WHERE table_name = 'funcionario' AND table_schema = 'public';
    
    RAISE NOTICE '=== FASE 5 CONCLUÍDA ===';
    RAISE NOTICE 'Colunas da tabela CLIENTE: %', cliente_cols;
    RAISE NOTICE 'Colunas da tabela FUNCIONARIO: %', funcionario_cols;
    RAISE NOTICE 'As colunas nome, email e senha agora existem apenas em PESSOA';
END $$;

-- 9. Testar as views
SELECT 'Teste v_cliente_compat:' AS teste;
SELECT cpf, nome, email FROM v_cliente_compat LIMIT 3;

SELECT 'Teste v_funcionario_compat:' AS teste;
SELECT cpf, nome, cargo, nome_cargo FROM v_funcionario_compat LIMIT 3;

SELECT 'Teste v_pedido_completo:' AS teste;
SELECT id_pedido, cliente_nome, total FROM v_pedido_completo LIMIT 3;
