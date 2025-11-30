-- ============================================================================
-- MIGRAÇÃO: Fluxo de Pedidos conforme Modelo do Professor (CandyShop)
-- Banco: habib-shop
-- Data: Gerado automaticamente
-- ============================================================================
-- Este script adapta o banco de dados do HabibPerfumeShop para seguir
-- exatamente o modelo do professor (dw1-modelo-4bim/CandyShop)
-- ============================================================================

-- 1. Adicionar coluna endereco_pessoa em pessoa (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pessoa' AND column_name = 'endereco_pessoa'
    ) THEN
        ALTER TABLE pessoa ADD COLUMN endereco_pessoa VARCHAR(150);
        RAISE NOTICE 'Coluna endereco_pessoa adicionada à tabela pessoa';
    ELSE
        RAISE NOTICE 'Coluna endereco_pessoa já existe em pessoa';
    END IF;
END $$;

-- 2. Adicionar coluna funcionario_pessoa_cpf_pessoa em pedido (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pedido' AND column_name = 'funcionario_pessoa_cpf_pessoa'
    ) THEN
        -- Primeiro adiciona a coluna sem FK
        ALTER TABLE pedido ADD COLUMN funcionario_pessoa_cpf_pessoa VARCHAR(20);
        RAISE NOTICE 'Coluna funcionario_pessoa_cpf_pessoa adicionada à tabela pedido';
    ELSE
        RAISE NOTICE 'Coluna funcionario_pessoa_cpf_pessoa já existe em pedido';
    END IF;
END $$;

-- 3. Renomear cliente_cpf para cliente_pessoa_cpf_pessoa (se necessário)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pedido' AND column_name = 'cliente_cpf'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pedido' AND column_name = 'cliente_pessoa_cpf_pessoa'
    ) THEN
        ALTER TABLE pedido RENAME COLUMN cliente_cpf TO cliente_pessoa_cpf_pessoa;
        RAISE NOTICE 'Coluna cliente_cpf renomeada para cliente_pessoa_cpf_pessoa';
    ELSE
        RAISE NOTICE 'Coluna cliente_pessoa_cpf_pessoa já existe ou cliente_cpf não encontrada';
    END IF;
END $$;

-- 4. Criar tabela pagamento (modelo do professor: PK = pedido_id_pedido)
DROP TABLE IF EXISTS pagamento_has_forma_pagamento CASCADE;
DROP TABLE IF EXISTS pagamento CASCADE;

CREATE TABLE pagamento (
    pedido_id_pedido INTEGER NOT NULL PRIMARY KEY,
    data_pagamento TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    valor_total_pagamento DOUBLE PRECISION,
    FOREIGN KEY (pedido_id_pedido) REFERENCES pedido(id_pedido) ON DELETE CASCADE
);

RAISE NOTICE 'Tabela pagamento criada conforme modelo do professor';

-- 5. Criar tabela pagamento_has_forma_pagamento (chave composta)
CREATE TABLE pagamento_has_forma_pagamento (
    pagamento_id_pedido INTEGER NOT NULL,
    forma_pagamento_id_forma_pagamento INTEGER NOT NULL,
    valor_pago DOUBLE PRECISION,
    PRIMARY KEY (pagamento_id_pedido, forma_pagamento_id_forma_pagamento),
    FOREIGN KEY (pagamento_id_pedido) REFERENCES pagamento(pedido_id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (forma_pagamento_id_forma_pagamento) REFERENCES forma_pagamento(id_forma_pagamento)
);

RAISE NOTICE 'Tabela pagamento_has_forma_pagamento criada conforme modelo do professor';

-- 6. Garantir funcionário padrão para pedidos online (CPF 00000000000)
-- Primeiro, criar pessoa online se não existir
INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, data_nascimento)
VALUES ('00000000000', 'online', 'online@habib.com', 'abc123', '1900-01-01')
ON CONFLICT (cpf_pessoa) DO UPDATE SET nome_pessoa = 'online';

-- Verificar/Criar cargo para funcionário online
INSERT INTO cargo (nome_cargo)
SELECT 'Vendedor online'
WHERE NOT EXISTS (
    SELECT 1 FROM cargo WHERE LOWER(nome_cargo) LIKE '%online%'
);

-- Buscar id do cargo online
DO $$
DECLARE
    cargo_online_id INTEGER;
BEGIN
    SELECT id_cargo INTO cargo_online_id FROM cargo WHERE LOWER(nome_cargo) LIKE '%online%' LIMIT 1;
    
    IF cargo_online_id IS NULL THEN
        -- Se não encontrou, pega o primeiro cargo ou cria um
        SELECT id_cargo INTO cargo_online_id FROM cargo LIMIT 1;
    END IF;
    
    -- Inserir funcionário online se não existir
    INSERT INTO funcionario (cpf, cargo, salario, porcentagem_comissao, pessoa_cpf_pessoa, cargo_id_cargo)
    VALUES ('00000000000', 'Vendedor online', 0, 0, '00000000000', cargo_online_id)
    ON CONFLICT (cpf) DO UPDATE SET cargo = 'Vendedor online';
    
    RAISE NOTICE 'Funcionário online (00000000000) criado/atualizado';
END $$;

-- 7. Adicionar FK de funcionario em pedido (se não existir)
DO $$
BEGIN
    -- Remove FK antiga se existir com nome diferente
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'pedido' AND constraint_type = 'FOREIGN KEY' 
        AND constraint_name LIKE '%funcionario%'
    ) THEN
        RAISE NOTICE 'FK de funcionario já existe em pedido';
    ELSE
        -- Adiciona a FK
        ALTER TABLE pedido 
        ADD CONSTRAINT fk_pedido_funcionario 
        FOREIGN KEY (funcionario_pessoa_cpf_pessoa) 
        REFERENCES funcionario(cpf);
        RAISE NOTICE 'FK fk_pedido_funcionario adicionada';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao adicionar FK de funcionario: %', SQLERRM;
END $$;

-- 8. Atualizar pedidos existentes sem funcionário
UPDATE pedido 
SET funcionario_pessoa_cpf_pessoa = '00000000000' 
WHERE funcionario_pessoa_cpf_pessoa IS NULL;

-- 9. Popular forma_pagamento se vazia (conforme modelo professor)
INSERT INTO forma_pagamento (nome_forma)
SELECT nome FROM (VALUES 
    ('Dinheiro'),
    ('Cartão de Crédito'),
    ('Cartão de Débito'),
    ('Pix'),
    ('Boleto'),
    ('Vale Alimentação'),
    ('Transferência Bancária'),
    ('Cheque'),
    ('Crédito Loja'),
    ('Gift Card')
) AS t(nome)
WHERE NOT EXISTS (SELECT 1 FROM forma_pagamento WHERE LOWER(nome_forma) = LOWER(t.nome));

-- 10. Verificar estrutura final
SELECT 'Estrutura de tabelas após migração:' AS info;

SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('pedido', 'pagamento', 'pagamento_has_forma_pagamento', 'pessoa')
ORDER BY table_name, ordinal_position;

-- FIM DA MIGRAÇÃO
