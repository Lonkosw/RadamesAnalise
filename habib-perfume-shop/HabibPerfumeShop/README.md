# 🌸 Habib Perfume Shop

> Sistema de e-commerce para loja de perfumes desenvolvido como projeto da disciplina de Desenvolvimento Web I - 4º Bimestre

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-green)
![PostgreSQL](https://img.shields.io/badge/postgresql-13+-blue)
![Express](https://img.shields.io/badge/express-4.x-lightgrey)

## 📋 Sumário

- [Descrição do Projeto](#-descrição-do-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Fluxos do Sistema](#-fluxos-do-sistema)
- [Endpoints da API](#-endpoints-da-api)
- [Desafios e Soluções](#-desafios-e-soluções)
- [Aprendizados](#-aprendizados)
- [Autor](#-autor)

---

## 📖 Descrição do Projeto

O **Habib Perfume Shop** é um sistema completo de e-commerce para uma loja de perfumes, desenvolvido seguindo o modelo arquitetural do professor (CandyShop/dw1-modelo-4bim). O sistema oferece duas visões principais:

1. **Visão do Cliente**: Navegação pelo catálogo, carrinho de compras, finalização de pedido e histórico de compras
2. **Visão do Gerente**: Gestão de produtos, funcionários, clientes e relatórios gerenciais

O projeto foi desenvolvido com foco em:
- Arquitetura MVC (Model-View-Controller)
- API RESTful com Express.js
- Autenticação baseada em cookies
- Interface responsiva com HTML/CSS/JavaScript vanilla

---

## ⭐ Funcionalidades

### 🛒 Para Clientes
- [x] Cadastro e login de clientes
- [x] Visualização do catálogo de perfumes
- [x] Carrinho de compras (adicionar, remover, alterar quantidade)
- [x] Finalização de pedido online
- [x] Seleção de forma de pagamento
- [x] Pagamento via PIX (com simulação de confirmação)
- [x] Histórico de pedidos ("Meus Pedidos")

### 👔 Para Gerentes/Funcionários
- [x] Login de funcionários com níveis de acesso
- [x] CRUD completo de produtos (perfumes)
- [x] CRUD de clientes
- [x] CRUD de funcionários
- [x] Registro de pedidos presenciais (balcão)
- [x] Relatório 1: Vendas por Período
- [x] Relatório 2: Produtos Mais Vendidos

### 🔧 Funcionalidades Técnicas
- [x] Autenticação via cookies HttpOnly
- [x] Controle de sessão com expiração
- [x] Upload de imagens de produtos
- [x] Controle de estoque automático
- [x] Logs de requisições para debugging

---

## 🛠 Tecnologias Utilizadas

### Backend
| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| Node.js | 14+ | Runtime JavaScript |
| Express.js | 4.x | Framework web |
| PostgreSQL | 13+ | Banco de dados relacional |
| bcryptjs | 2.x | Hash de senhas |
| cookie-parser | 1.x | Parser de cookies |

### Frontend
| Tecnologia | Descrição |
|------------|-----------|
| HTML5 | Estrutura das páginas |
| CSS3 | Estilização e responsividade |
| JavaScript (ES6+) | Lógica de interação |
| Fetch API | Requisições HTTP |

---

## 📁 Estrutura do Projeto

```
HabibPerfumeShop/
├── backend/
│   ├── controllers/           # Lógica de negócio
│   │   ├── clienteController.js
│   │   ├── funcionarioController.js
│   │   ├── loginController.js
│   │   ├── pagamentoController.js
│   │   ├── pedidoController.js
│   │   ├── produtoController.js
│   │   └── relatorioController.js
│   ├── middleware/
│   │   └── auth.js            # Middleware de autenticação
│   ├── routes/                # Definição de rotas
│   │   ├── clienteRoutes.js
│   │   ├── loginRoutes.js
│   │   ├── pedidoRoutes.js
│   │   ├── produtoRoutes.js
│   │   ├── relatorioRoutes.js
│   │   └── ...
│   ├── database.js            # Configuração PostgreSQL
│   └── server.js              # Ponto de entrada
├── frontend/
│   ├── visaoCliente/          # Páginas do cliente (e-commerce)
│   │   ├── index.html         # Catálogo de produtos
│   │   ├── carrinho.html      # Carrinho de compras
│   │   ├── finalizar.html     # Finalização do pedido
│   │   ├── pagamento.html     # Pagamento
│   │   └── pedidos.html       # Histórico de pedidos
│   ├── relatorios/            # Relatórios do gerente
│   │   ├── index.html
│   │   └── relatorios.css
│   ├── perfume/               # CRUD de perfumes
│   ├── cliente/               # CRUD de clientes
│   ├── funcionario/           # CRUD de funcionários
│   ├── login/                 # Tela de login
│   ├── menu.html              # Menu principal
│   ├── menu.js
│   └── menu.css
├── documentacao/
│   ├── script-habib-shop.sql  # Script do banco de dados
│   ├── tutorial.md            # Tutorial de configuração
│   └── README_migracoes.md    # Histórico de migrações
├── uploads/                   # Imagens de produtos
├── index.html                 # Página inicial
├── package.json
└── README.md
```

---

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 14 ou superior
- PostgreSQL 13 ou superior
- npm ou yarn

### Passo 1: Clonar o repositório
```bash
git clone https://github.com/seu-usuario/habib-perfume-shop.git
cd habib-perfume-shop/HabibPerfumeShop
```

### Passo 2: Instalar dependências
```bash
npm install
```

### Passo 3: Configurar o banco de dados
1. Criar o banco de dados no PostgreSQL:
```sql
CREATE DATABASE "habib-shop";
```

2. Executar o script de criação:
```bash
psql -U postgres -d habib-shop -f documentacao/script-habib-shop.sql
```

3. Configurar a conexão em `backend/database.js`:
```javascript
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '050309',  // Altere para sua senha
  database: 'habib-shop'
});
```

### Passo 4: Iniciar o servidor
```bash
npm start
```

### Passo 5: Acessar o sistema
- **Página inicial**: http://localhost:3001
- **Login**: http://localhost:3001/login
- **E-commerce (cliente)**: http://localhost:3001/visaoCliente

---

## 🔄 Fluxos do Sistema

### Fluxo de Compra Online (Cliente)
```
1. Cliente acessa /visaoCliente
2. Navega pelo catálogo de perfumes
3. Adiciona produtos ao carrinho
4. Vai para /visaoCliente/carrinho
5. Revisa itens e clica "Finalizar Compra"
6. Sistema cria pedido automático
7. Cliente escolhe forma de pagamento
8. Se PIX: gera código e aguarda confirmação
9. Pagamento confirmado → Pedido concluído
```

### Fluxo de Pedido Presencial (Gerente)
```
1. Funcionário faz login
2. Acessa menu → Pedidos
3. Seleciona produtos e quantidades
4. Informa cliente (CPF ou genérico)
5. Registra pagamento
6. Pedido concluído
```

---

## 📡 Endpoints da API

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/login/verificar` | Login de usuário |
| POST | `/login/logout` | Encerrar sessão |
| GET | `/login/checar` | Verificar sessão ativa |

### Produtos (Perfumes)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/produto` | Listar produtos |
| GET | `/produto/:id` | Buscar produto |
| POST | `/produto` | Criar produto |
| PUT | `/produto/:id` | Atualizar produto |
| DELETE | `/produto/:id` | Excluir produto |

### Pedidos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/pedido` | Listar pedidos |
| GET | `/pedido/:id` | Buscar pedido |
| POST | `/pedido/online` | Criar pedido online |
| POST | `/pedido/gerente` | Criar pedido presencial |

### Pagamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/pagamento` | Registrar pagamento |
| POST | `/pagamento/pix` | Gerar código PIX |
| POST | `/pagamento/confirmar-pix` | Confirmar pagamento PIX |

### Relatórios
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/relatorio/vendas-periodo` | Vendas por período |
| GET | `/relatorio/produtos-mais-vendidos` | Ranking de produtos |

---

## 💪 Desafios e Soluções

### 1. Integração do Modelo do Professor
**Desafio**: Adaptar o modelo CandyShop para um e-commerce de perfumes mantendo a estrutura de banco de dados e nomenclatura de rotas compatíveis.

**Solução**: Realizamos um mapeamento completo das tabelas e rotas, criando migrações incrementais para evitar perda de dados. Mantivemos a nomenclatura `produto` para compatibilidade.

### 2. Fluxo de Carrinho e Sessão
**Desafio**: Implementar um carrinho que funcione tanto para clientes logados quanto para visitantes, usando sessionStorage no frontend.

**Solução**: Utilizamos `sessionStorage` para manter o carrinho no navegador e sincronizamos com o backend apenas no momento da finalização do pedido.

### 3. Sistema de Pagamento PIX
**Desafio**: Simular um fluxo de pagamento PIX sem integração real com bancos.

**Solução**: Criamos uma tabela `pagamento_pix` com código de transação único e um endpoint de confirmação manual que simula o callback de um gateway de pagamento.

### 4. Controle de Estoque
**Desafio**: Garantir que o estoque seja atualizado automaticamente após cada venda.

**Solução**: Implementamos triggers no controller de pedidos que decrementam o estoque ao criar o pedido e poderiam reverter em caso de cancelamento.

### 5. Autenticação e Segurança
**Desafio**: Implementar autenticação segura sem JWT, usando apenas cookies.

**Solução**: Utilizamos cookies HttpOnly com informações do usuário logado, incluindo tipo (cliente/funcionário) e cargo, permitindo controle de acesso nas rotas.

---

## 📚 Aprendizados

### Técnicos
1. **Arquitetura MVC**: Entendimento profundo da separação de responsabilidades entre Model, View e Controller
2. **API RESTful**: Boas práticas no design de endpoints e uso correto de verbos HTTP
3. **PostgreSQL**: Consultas complexas com JOINs, funções de agregação e subconsultas
4. **Cookies e Sessões**: Implementação de autenticação stateful com cookies HttpOnly
5. **Frontend sem frameworks**: Manipulação direta do DOM e Fetch API

### Conceituais
1. **Fluxo de E-commerce**: Entendimento completo do ciclo de vida de um pedido
2. **Segurança Web**: Importância de validação de dados e proteção contra injeção
3. **Experiência do Usuário**: Design de interfaces intuitivas para clientes e gerentes
4. **Versionamento**: Uso de Git para controle de versões e branches

### Soft Skills
1. **Resolução de Problemas**: Debugging sistemático de erros de integração
2. **Documentação**: Importância de documentar código e decisões de design
3. **Gestão de Tempo**: Priorização de funcionalidades obrigatórias vs. opcionais

---

## 🏗️ Melhorias Futuras

- [ ] Implementar busca e filtros no catálogo
- [ ] Adicionar sistema de avaliações de produtos
- [ ] Integrar gateway de pagamento real
- [ ] Implementar notificações por email
- [ ] Adicionar dashboard com gráficos
- [ ] Implementar sistema de cupons de desconto

---

## 👨‍💻 Autor

**Nome do Aluno**  
Desenvolvimento Web I - 4º Bimestre  
Curso: [Nome do Curso]  
Instituição: [Nome da Instituição]

---

## 📄 Licença

Este projeto foi desenvolvido para fins educacionais como parte da avaliação da disciplina de Desenvolvimento Web I.

---

<div align="center">
  <strong>⭐ Habib Perfume Shop - Fragrâncias que encantam ⭐</strong>
</div>
