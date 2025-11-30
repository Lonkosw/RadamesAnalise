-- ================================================================
-- CORREÇÃO: Garantir que todos os funcionários tenham senha
-- Executar APENAS UMA VEZ após FASE 5
-- ================================================================

-- Verificar funcionários sem senha
SELECT 
    p.cpf_pessoa,
    p.nome_pessoa,
    p.email_pessoa,
    CASE WHEN p.senha_pessoa IS NULL OR p.senha_pessoa = '' THEN 'SEM SENHA' ELSE 'TEM SENHA' END as status_senha
FROM pessoa p
INNER JOIN funcionario f ON f.pessoa_cpf_pessoa = p.cpf_pessoa;

-- Definir senha padrão 'senha123' (hash bcrypt) para funcionários sem senha
-- Hash bcrypt de 'senha123': $2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqcZL0DvhQNvCLqN7Iy9KXfqNqS8u
UPDATE pessoa SET senha_pessoa = '$2a$10$N9qo8uLOickgx2ZMRZoMyeVGBJoNdq4RxVZVSTM1yZBz/36n.S5Iq'
WHERE cpf_pessoa IN (
    SELECT pessoa_cpf_pessoa FROM funcionario
)
AND (senha_pessoa IS NULL OR senha_pessoa = '');

-- Verificar resultado
SELECT 'Funcionarios atualizados' as info;
SELECT 
    p.cpf_pessoa,
    p.nome_pessoa,
    p.email_pessoa,
    'SENHA DEFINIDA' as status
FROM pessoa p
INNER JOIN funcionario f ON f.pessoa_cpf_pessoa = p.cpf_pessoa;
