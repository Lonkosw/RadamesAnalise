// Carregar variáveis de ambiente
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const app = express();
const path = require('path');

const cookieParser = require('cookie-parser');

// Importar a configuração do banco PostgreSQL
const db = require('./database'); // Ajuste o caminho conforme necessário

// Configurações do servidor - quando em produção, você deve substituir o IP e a porta pelo do seu servidor remoto
//const HOST = '192.168.1.100'; // Substitua pelo IP do seu servidor remoto
const HOST = 'localhost'; // Para desenvolvimento local
const PORT_FIXA = 3001; // Porta fixa

// serve a pasta frontend como arquivos estáticos

// serve a pasta frontend como arquivos estáticos

const caminhoFrontend = path.join(__dirname, '../frontend');
console.log('Caminho frontend:', caminhoFrontend);
// preparar caminho de imagens de produto (modelo B); montagem será após as rotas
const caminhoImagensProduto = path.join(__dirname, '../imagens', 'produto');
// caminho de imagens de notas olfativas
const caminhoImagensNotas = path.join(__dirname, '../imagens', 'notas');



app.use(cookieParser());
// Middleware para interpretar cookie de usuario
const { parseUser } = require('./middleware/auth');
app.use(parseUser);

// Rotas estáticas ANTES das rotas de API para evitar conflitos
// Pasta pessoa servida em /pessoa-static para evitar conflito com API /pessoa
app.use('/pessoa-static', express.static(path.join(__dirname, '../frontend/pessoa')));

// Logging básico de requisições (diagnóstico de 404/400 em /produto)
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});
// Logger de resposta (status) para diagnosticar 400 em /produto
app.use((req, res, next) => {
  const start = Date.now();
  const origEnd = res.end;
  res.end = function(...args){
    const ms = Date.now() - start;
    console.log(`[RESP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    origEnd.apply(this, args);
  };
  next();
});

// Middleware para permitir CORS (Cross-Origin Resource Sharing)
// Isso é útil se você estiver fazendo requisições de um frontend que está rodando em um domínio diferente
// ou porta do backend.
// Em produção, você deve restringir isso para domínios específicos por segurança.
// Aqui, estamos permitindo qualquer origem, o que é útil para desenvolvimento, mas deve ser ajustado em produção.
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://127.0.0.1:5500','http://localhost:5500',
    'http://127.0.0.1:5501','http://localhost:5501',
    'http://localhost:3000','http://localhost:3001'
  ];
  const origin = req.headers.origin;
  if (origin) {
    if (allowedOrigins.includes(origin) || /^(http:\/\/localhost:|http:\/\/127\.0\.0\.1:)/.test(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Middleware para adicionar a instância do banco de dados às requisições
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Middlewares
app.use(express.json());

// Middleware de tratamento de erros JSON malformado
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON malformado',
      message: 'Verifique a sintaxe do JSON enviado'
    });
  }
  next(err);
});

// só mexa nessa parte
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Importando as rotas necessárias
const menuRoutes = require('./routes/menuRoutes');
app.use('/menu', menuRoutes);

// Ajuste de nomenclatura/estrutura para alinhar ao modelo B
const produtoRoutes = require('./routes/produtoRoutes');
// Montagem com múltiplos aliases para evitar 404 por variações
app.use(['/produto', '/produto/', '/produtos'], produtoRoutes);


const pedidoRoutes = require('./routes/pedidoRoutes');
app.use('/pedido', pedidoRoutes);

// Itens de pedido (modelo B)
const pedido_has_produtoRoutes = require('./routes/pedido_has_produtoRoutes');
app.use('/pedido_has_produto', pedido_has_produtoRoutes);

const forma_pagamentoRoutes = require('./routes/forma_pagamentoRoutes');
app.use('/forma_pagamento', forma_pagamentoRoutes);

// Rotas de pagamento (modelo professor)
const pagamentoRoutes = require('./routes/pagamentoRoutes');
app.use('/pagamento', pagamentoRoutes);

const clienteRoutes = require('./routes/clienteRoutes');
app.use('/cliente', clienteRoutes);

const funcionarioRoutes = require('./routes/funcionarioRoutes');
app.use('/funcionario', funcionarioRoutes);

const pessoaRoutes = require('./routes/pessoaRoutes');
app.use('/pessoa', pessoaRoutes);

const loginRoutes = require('./routes/loginRoutes');
app.use('/login', loginRoutes);

// Rotas de imagem conforme modelo B
const imageRoutes = require('./routes/imageRoutes');
app.use('/', imageRoutes);

// Rotas de cargo (modelo B)
const cargoRoutes = require('./routes/cargoRoutes');
app.use('/cargo', cargoRoutes);

// Rotas de relatórios do gerente (requisito obrigatório 4º bim)
const relatorioRoutes = require('./routes/relatorioRoutes');
app.use('/relatorio', relatorioRoutes);

// Rotas de recuperação de senha
const recuperacaoRoutes = require('./routes/recuperacaoRoutes');
app.use('/recuperar', recuperacaoRoutes);

// Rotas de marcas
const marcaRoutes = require('./routes/marcaRoutes');
app.use('/marca', marcaRoutes);

// const avaliadorRoutes = require('./routes/avaliadorRoutes');
// app.use('/avaliador', avaliadorRoutes);

// const avaliadoRoutes = require('./routes/avaliadoRoutes');
// app.use('/avaliado', avaliadoRoutes);


// const avaliacaoRoutes = require('./routes/avaliacaoRoutes');
// app.use('/avaliacao', avaliacaoRoutes);

// const avaliacaoHasQuestaoRoutes = require('./routes/avaliacaoHasQuestaoRoutes');
// app.use('/avaliacaoHasQuestao', avaliacaoHasQuestaoRoutes);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Estáticos: montar APÓS as rotas para evitar colisão com endpoints
app.use('/imagens-produtos', express.static(caminhoImagensProduto));
app.use('/imagens/notas', express.static(caminhoImagensNotas));
app.use(express.static(caminhoFrontend));

// Rota padrão
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'../index.html'));
});

// Fallback para /index.html
app.get('/index.html', (req,res)=>{
  res.sendFile(path.join(__dirname,'../index.html'));
});

// Endpoint de debug para listar rotas (apenas development)
if ((process.env.NODE_ENV || 'development') === 'development') {
  app.get('/_routes', (req, res) => {
    try {
      const routes = [];
      const stack = app._router && app._router.stack ? app._router.stack : [];
      stack.forEach((m) => {
        if (m.route && m.route.path) {
          routes.push({ methods: Object.keys(m.route.methods), path: m.route.path });
        } else if (m.name === 'router' && m.handle && Array.isArray(m.handle.stack)) {
          const base = m.regexp && m.regexp.fast_star ? '*' : (m.regexp && m.regexp.toString ? m.regexp.toString() : '');
          m.handle.stack.forEach((h) => {
            if (h.route) {
              routes.push({ base, methods: Object.keys(h.route.methods), path: h.route.path });
            }
          });
        }
      });
      res.json({ routes, count: routes.length });
    } catch (e) {
      res.status(500).json({ error: 'Falha ao inspecionar rotas', message: e.message });
    }
  });
}


// Rota para testar a conexão com o banco
app.get('/health', async (req, res) => {
  try {
    const connectionTest = await db.testConnection();

    if (connectionTest) {
      res.status(200).json({
        status: 'OK',
        message: 'Servidor e banco de dados funcionando',
        database: 'PostgreSQL',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        status: 'ERROR',
        message: 'Problema na conexão com o banco de dados',
        database: 'PostgreSQL',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Erro no health check:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erro interno do servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Identificação simples da instância e caminhos ativos
app.get('/whoami', (req, res) => {
  res.json({
    id: 'HabibPerfumeShop-backend',
    cwd: process.cwd(),
    serverDir: __dirname,
    startedAt: new Date().toISOString()
  });
});

// Middleware global de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);

  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado',
    timestamp: new Date().toISOString()
  });
});

// Middleware para rotas não encontradas (404)
app.use((req, res) => {
  const url = req.originalUrl || '';
  const apiPrefixes = [
    '/login','/menu','/funcionario','/cliente','/produto','/pedido',
    '/forma_pagamento','/pessoa','/imagens-produtos','/relatorio',
    '/pagamento','/cargo','/pedido_has_produto',
    '/health','/_routes'
  ];

  const isApiPath =
    apiPrefixes.some(p => url.startsWith(p + '/')) ||
    apiPrefixes.includes(url) ||
    apiPrefixes.some(p => url === p + '/');

  if(!url.includes('.') && !isApiPath){
    return res.sendFile(path.join(__dirname,'../index.html'));
  }

  res.status(404).json({
    error: 'Rota não encontrada',
    message: `A rota ${url} não existe`,
    timestamp: new Date().toISOString()
  });
});




// Inicialização do servidor
const startServer = async () => {
  try {
    // Testar conexão com o banco antes de iniciar o servidor
    console.log(caminhoFrontend);
    console.log('Testando conexão com PostgreSQL...');
    const connectionTest = await db.testConnection();

    if (!connectionTest) {
      console.error('❌ Falha na conexão com PostgreSQL');
      process.exit(1);
    }

    console.log('✅ PostgreSQL conectado com sucesso');

    const PORT = process.env.PORT || PORT_FIXA;

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
      console.log(`📊 Health check disponível em http://${HOST}:${PORT}/health`);
      console.log(`🗄️ Banco de dados: PostgreSQL`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
};

// Tratamento de sinais para encerramento graceful
process.on('SIGINT', async () => {
  console.log('\n🔄 Encerrando servidor...');

  try {
    await db.pool.end();
    console.log('✅ Conexões com PostgreSQL encerradas');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao encerrar conexões:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 SIGTERM recebido, encerrando servidor...');

  try {
    await db.pool.end();
    console.log('✅ Conexões com PostgreSQL encerradas');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao encerrar conexões:', error);
    process.exit(1);
  }
});

// Iniciar o servidor
startServer();