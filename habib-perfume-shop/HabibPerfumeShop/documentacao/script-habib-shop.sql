-- (1) criar banco (opcional - execute separadamente se preferir)
-- CREATE DATABASE "PerfumeShop";
-- \c "PerfumeShop"   -- no psql, conecta ao DB criado

-- (2) limpa tabelas caso já existam (ordem irrelevante por uso de CASCADE)
DROP TABLE IF EXISTS pagamento_pix CASCADE;
DROP TABLE IF EXISTS pagamento CASCADE;
DROP TABLE IF EXISTS forma_pagamento CASCADE;
DROP TABLE IF EXISTS item_carrinho CASCADE;
DROP TABLE IF EXISTS carrinho CASCADE;
DROP TABLE IF EXISTS item_pedido CASCADE;
DROP TABLE IF EXISTS pedido CASCADE;
DROP TABLE IF EXISTS perfume CASCADE;
DROP TABLE IF EXISTS funcionario CASCADE;
DROP TABLE IF EXISTS cliente CASCADE;

-- ========================
-- TABELA CLIENTE
-- ========================
CREATE TABLE cliente (
  cpf CHAR(11) PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL
);

-- ========================
-- TABELA FUNCIONARIO
-- ========================
CREATE TABLE funcionario (
  cpf CHAR(11) PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cargo VARCHAR(50) NOT NULL,
  salario NUMERIC(10,2),
  porcentagem_comissao NUMERIC(5,2),
  email VARCHAR(100) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL
);

-- ========================
-- TABELA PRODUTO (modelo B)
-- ========================
CREATE TABLE produto (
  id_produto SERIAL PRIMARY KEY,
  nome_produto VARCHAR(100) NOT NULL,
  marca_produto VARCHAR(100),
  volume_ml INT,
  concentracao VARCHAR(50),
  descricao_produto TEXT,
  preco_produto NUMERIC(10,2) NOT NULL,
  quantidade_estoque INT NOT NULL
);

-- ========================
-- TABELA PEDIDO
-- ========================
CREATE TABLE pedido (
  id_pedido SERIAL PRIMARY KEY,
  data_pedido TIMESTAMP WITH TIME ZONE DEFAULT now(),
  cliente_cpf CHAR(11) NOT NULL REFERENCES cliente(cpf) ON DELETE CASCADE
);

-- ========================
-- TABELA PEDIDO_HAS_PRODUTO (modelo B)
-- ========================
CREATE TABLE pedido_has_produto (
  pedido_id_pedido INT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
  produto_id_produto INT NOT NULL REFERENCES produto(id_produto),
  quantidade INT NOT NULL,
  preco_unitario NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (pedido_id_pedido, produto_id_produto)
);

-- (Removidas tabelas carrinho e item_carrinho para alinhar ao modelo B)

-- ========================
-- TABELA FORMA_PAGAMENTO
-- ========================
CREATE TABLE forma_pagamento (
  id_forma_pagamento SERIAL PRIMARY KEY,
  nome_forma VARCHAR(50) NOT NULL
);

-- (Removidas tabelas pagamento e pagamento_pix para alinhar ao modelo B)

-- ========================
-- POPULA CLIENTE (5 registros)
-- ========================
INSERT INTO cliente (cpf, nome, email, senha) VALUES
('11111111111','Ana Silva','ana.silva@email.com','senha123'),
('22222222222','Bruno Costa','bruno.costa@email.com','123456'),
('33333333333','Carla Souza','carla.souza@email.com','abc123'),
('44444444444','Diego Lima','diego.lima@email.com','minhasenha'),
('55555555555','Fernanda Rocha','fernanda.rocha@email.com','senha789');

-- ========================
-- POPULA FUNCIONARIO (5 registros)
-- ========================
-- Senhas de exemplo (plain) - em produção usar hash
INSERT INTO funcionario (cpf, nome, cargo, salario, porcentagem_comissao, email, senha) VALUES
('99911111111','Marcos Pereira','Gerente',4500.00,5.00,'marcos.pereira@empresa.com','gerente123'),
('99922222222','Juliana Mendes','Vendedor',2500.00,7.50,'juliana.mendes@empresa.com','vend123'),
('99933333333','Rodrigo Alves','Caixa',2200.00,0.00,'rodrigo.alves@empresa.com','caixa123'),
('99944444444','Paula Fernandes','Atendente',2000.00,3.00,'paula.fernandes@empresa.com','atend123'),
('99955555555','Lucas Martins','Estoquista',1900.00,0.00,'lucas.martins@empresa.com','estoq123');

-- ========================
-- POPULA PRODUTO (5 registros)
-- ========================
INSERT INTO produto (nome_produto, marca_produto, volume_ml, concentracao, descricao_produto, preco_produto, quantidade_estoque) VALUES
('Eternity','Calvin Klein',100,'Eau de Parfum','Notas cítricas e florais',350.00,20),
('212 VIP','Carolina Herrera',100,'Eau de Toilette','Aroma doce e amadeirado',420.00,15),
('La Vie Est Belle','Lancôme',75,'Eau de Parfum','Notas doces e florais',500.00,10),
('Invictus','Paco Rabanne',100,'Eau de Toilette','Fresco e amadeirado',390.00,25),
('Light Blue','Dolce & Gabbana',100,'Eau de Toilette','Cítrico e leve',330.00,30);

-- (Removidos seeds de carrinho e item_carrinho para alinhar ao modelo B)

-- ========================
-- POPULA PEDIDO (5 registros)
-- ========================
INSERT INTO pedido (cliente_cpf) VALUES
('11111111111'),
('22222222222'),
('33333333333'),
('44444444444'),
('55555555555');

-- ========================
-- POPULA PEDIDO_HAS_PRODUTO (5 registros)
-- ========================
INSERT INTO pedido_has_produto (pedido_id_pedido, produto_id_produto, quantidade, preco_unitario) VALUES
(1, 1, 2, 350.00),
(2, 2, 1, 420.00),
(3, 3, 1, 500.00),
(3, 4, 1, 390.00),
(4, 5, 1, 330.00);

-- ========================
-- POPULA FORMA_PAGAMENTO (5 registros)
-- ========================
INSERT INTO forma_pagamento (nome_forma) VALUES
('PIX'),
('DINHEIRO'),
('CARTAO'),
('BOLETO'),
('TRANSFERENCIA');

-- (Removidos seeds de pagamento e pagamento_pix para alinhar ao modelo B)
