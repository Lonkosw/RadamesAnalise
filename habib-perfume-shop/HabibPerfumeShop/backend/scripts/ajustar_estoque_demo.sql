-- Script simples para ajustar estoque para demonstracao
-- Define quantidade_estoque = 10 para produtos com estoque nulo ou negativo

UPDATE produto
SET quantidade_estoque = 10
WHERE quantidade_estoque IS NULL OR quantidade_estoque <= 0;

-- Opcional: garante pelo menos 1 para todos
-- UPDATE produto SET quantidade_estoque = GREATEST(quantidade_estoque, 1);
