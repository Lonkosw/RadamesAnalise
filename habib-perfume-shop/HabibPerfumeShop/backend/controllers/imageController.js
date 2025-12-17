const path = require('path');
const fs = require('fs/promises');
const axios = require('axios');
const { query } = require('../database');

// Diretório de imagens de produtos
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'imagens', 'produto');

// Diretório de imagens de notas olfativas
const NOTAS_UPLOAD_DIR = path.join(__dirname, '..', '..', 'imagens', 'notas');

// Extensões permitidas
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
const ALLOWED_MIMETYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Tamanho máximo: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Middleware para garantir que os diretórios existem
const ensureUploadDir = async (_req, _res, next) => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(NOTAS_UPLOAD_DIR, { recursive: true });
    next();
  } catch (error) {
    console.error('Erro ao criar diretório de upload:', error);
    next(error);
  }
};

// Função auxiliar para deletar imagens antigas de um produto
const deletarImagemAntiga = async (produtoId) => {
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    const produtoFiles = files.filter(f => {
      const baseName = path.basename(f, path.extname(f));
      // Procura arquivos que comecem com o ID do produto (formato: id.ext ou id_timestamp.ext)
      return baseName === String(produtoId) || baseName.startsWith(`${produtoId}_`);
    });
    
    for (const file of produtoFiles) {
      const filePath = path.join(UPLOAD_DIR, file);
      await fs.unlink(filePath);
      console.log(`🗑️ Imagem antiga removida: ${file}`);
    }
    return produtoFiles.length;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Erro ao deletar imagem antiga:', error);
    }
    return 0;
  }
};

// Função para obter extensão do mimetype
const getExtensionFromMimetype = (mimetype) => {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp'
  };
  return map[mimetype] || null;
};

// Upload de imagem (POST /upload-image)
const uploadImage = async (req, res) => {
  try {
    const { produtoId, imageSource, imageUrl } = req.body;
    
    // Validação do ID do produto
    if (!produtoId) {
      return res.status(400).json({ message: 'ID do Produto é obrigatório.' });
    }
    
    const id = parseInt(produtoId, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: 'ID do Produto inválido.' });
    }
    
    let imageBuffer;
    let extension;
    let originalName = '';
    
    // Fonte: arquivo local
    if (imageSource === 'local' && req.file) {
      imageBuffer = req.file.buffer;
      originalName = req.file.originalname || '';
      
      // Validar tamanho
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(413).json({ 
          message: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          maxSize: MAX_FILE_SIZE
        });
      }
      
      // Validar mimetype
      const mimetype = (req.file.mimetype || '').toLowerCase();
      if (!ALLOWED_MIMETYPES.includes(mimetype)) {
        return res.status(415).json({ 
          message: 'Formato não suportado. Use: PNG, JPG ou WEBP',
          allowedFormats: ALLOWED_EXTENSIONS
        });
      }
      
      extension = getExtensionFromMimetype(mimetype);
      
    // Fonte: URL externa
    } else if (imageSource === 'url' && imageUrl) {
      try {
        const response = await axios.get(imageUrl, { 
          responseType: 'arraybuffer',
          timeout: 10000, // 10 segundos
          maxContentLength: MAX_FILE_SIZE
        });
        imageBuffer = response.data;
        
        // Validar mimetype da resposta
        const contentType = (response.headers['content-type'] || '').toLowerCase();
        if (!ALLOWED_MIMETYPES.some(mt => contentType.includes(mt))) {
          // Tentar inferir pela URL
          const urlLower = imageUrl.toLowerCase();
          if (urlLower.endsWith('.png')) extension = 'png';
          else if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg')) extension = 'jpg';
          else if (urlLower.endsWith('.webp')) extension = 'webp';
          else {
            return res.status(415).json({ 
              message: 'Formato da imagem na URL não suportado. Use: PNG, JPG ou WEBP',
              allowedFormats: ALLOWED_EXTENSIONS
            });
          }
        } else {
          extension = getExtensionFromMimetype(contentType.split(';')[0].trim());
        }
        
        // Validar tamanho
        if (imageBuffer.length > MAX_FILE_SIZE) {
          return res.status(413).json({ 
            message: `Imagem muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            maxSize: MAX_FILE_SIZE
          });
        }
        
      } catch (err) {
        const status = err.response?.status || 500;
        return res.status(400).json({ 
          message: `Falha ao baixar imagem da URL (HTTP ${status})`,
          url: imageUrl
        });
      }
      
    } else {
      return res.status(400).json({ message: 'Dados de imagem inválidos ou ausentes.' });
    }
    
    if (!extension) {
      return res.status(415).json({ message: 'Não foi possível determinar o formato da imagem.' });
    }
    
    // Deletar imagens antigas do mesmo produto
    const removidas = await deletarImagemAntiga(id);
    if (removidas > 0) {
      console.log(`📁 ${removidas} imagem(ns) antiga(s) removida(s) do produto #${id}`);
    }
    
    // Gerar nome único: id_timestamp.ext
    const timestamp = Date.now();
    const filename = `${id}_${timestamp}.${extension}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    // Salvar arquivo
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(filePath, Buffer.from(imageBuffer));
    
    // Atualizar caminho no banco de dados
    const imagemPath = `/imagens/produtos/${filename}`;
    await query(
      'UPDATE produto SET imagem_produto = $1 WHERE id_produto = $2',
      [imagemPath, id]
    );
    
    console.log(`✅ Imagem salva: ${filename} para produto #${id}`);
    
    res.status(201).json({ 
      message: 'Imagem salva com sucesso!',
      filename,
      path: imagemPath,
      size: imageBuffer.length,
      format: extension.toUpperCase(),
      viewUrl: `/view-image/${id}`
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar imagem:', error);
    res.status(500).json({ 
      message: 'Erro interno ao processar a imagem.',
      error: error.message
    });
  }
};

// Visualizar imagem (GET /view-image/:produtoId)
const viewImage = async (req, res) => {
  const { produtoId } = req.params;
  
  try {
    // Primeiro, buscar o caminho no banco
    const result = await query(
      'SELECT imagem_produto FROM produto WHERE id_produto = $1',
      [produtoId]
    );
    
    if (result.rows.length > 0 && result.rows[0].imagem_produto) {
      const imagemPath = result.rows[0].imagem_produto;
      const filename = path.basename(imagemPath);
      const filePath = path.join(UPLOAD_DIR, filename);
      
      try {
        await fs.access(filePath);
        return res.sendFile(filePath);
      } catch {
        // Arquivo não existe, continuar para busca por padrão
      }
    }
    
    // Fallback: procurar arquivo com o ID no diretório
    const files = await fs.readdir(UPLOAD_DIR);
    const produtoFile = files.find(f => {
      const baseName = path.basename(f, path.extname(f));
      return baseName === String(produtoId) || baseName.startsWith(`${produtoId}_`);
    });
    
    if (produtoFile) {
      const filePath = path.join(UPLOAD_DIR, produtoFile);
      return res.sendFile(filePath);
    }
    
    // Imagem não encontrada
    return res.status(404).json({ 
      message: `Imagem para o Produto ID ${produtoId} não encontrada.` 
    });
    
  } catch (error) {
    console.error('Erro ao buscar imagem:', error);
    return res.status(500).json({ message: 'Erro ao buscar imagem.' });
  }
};

// Deletar imagem (DELETE /delete-image/:produtoId)
const deleteImage = async (req, res) => {
  const { produtoId } = req.params;
  
  try {
    const id = parseInt(produtoId, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: 'ID do Produto inválido.' });
    }
    
    const removidas = await deletarImagemAntiga(id);
    
    // Limpar referência no banco
    await query(
      'UPDATE produto SET imagem_produto = NULL WHERE id_produto = $1',
      [id]
    );
    
    if (removidas > 0) {
      res.json({ message: `${removidas} imagem(ns) removida(s) com sucesso.`, count: removidas });
    } else {
      res.json({ message: 'Nenhuma imagem encontrada para remover.', count: 0 });
    }
    
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    res.status(500).json({ message: 'Erro ao deletar imagem.' });
  }
};

// =============================================================================
// NOTAS OLFATIVAS - Upload e Visualização
// =============================================================================

// Função auxiliar para deletar notas antigas de um produto
const deletarNotasAntigas = async (produtoId) => {
  try {
    const files = await fs.readdir(NOTAS_UPLOAD_DIR);
    const notasFiles = files.filter(f => {
      const baseName = path.basename(f, path.extname(f));
      return baseName === `notas_${produtoId}` || baseName.startsWith(`notas_${produtoId}_`);
    });
    
    for (const file of notasFiles) {
      const filePath = path.join(NOTAS_UPLOAD_DIR, file);
      await fs.unlink(filePath);
      console.log(`🗑️ Notas antigas removidas: ${file}`);
    }
    return notasFiles.length;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Erro ao deletar notas antigas:', error);
    }
    return 0;
  }
};

// Upload de notas olfativas (POST /upload-notas)
const uploadNotas = async (req, res) => {
  try {
    const { produtoId, imageSource, imageUrl } = req.body;
    
    if (!produtoId) {
      return res.status(400).json({ message: 'ID do Produto é obrigatório.' });
    }
    
    const id = parseInt(produtoId, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: 'ID do Produto inválido.' });
    }
    
    let imageBuffer;
    let extension;
    
    // Fonte: arquivo local
    if (imageSource === 'local' && req.file) {
      imageBuffer = req.file.buffer;
      
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(413).json({ 
          message: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        });
      }
      
      const mimetype = (req.file.mimetype || '').toLowerCase();
      if (!ALLOWED_MIMETYPES.includes(mimetype)) {
        return res.status(415).json({ 
          message: 'Formato não suportado. Use: PNG, JPG ou WEBP'
        });
      }
      
      extension = getExtensionFromMimetype(mimetype);
      
    // Fonte: URL externa
    } else if (imageSource === 'url' && imageUrl) {
      try {
        const response = await axios.get(imageUrl, { 
          responseType: 'arraybuffer',
          timeout: 10000,
          maxContentLength: MAX_FILE_SIZE
        });
        imageBuffer = response.data;
        
        const contentType = (response.headers['content-type'] || '').toLowerCase();
        if (!ALLOWED_MIMETYPES.some(mt => contentType.includes(mt))) {
          const urlLower = imageUrl.toLowerCase();
          if (urlLower.endsWith('.png')) extension = 'png';
          else if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg')) extension = 'jpg';
          else if (urlLower.endsWith('.webp')) extension = 'webp';
          else {
            return res.status(415).json({ message: 'Formato não suportado. Use: PNG, JPG ou WEBP' });
          }
        } else {
          extension = getExtensionFromMimetype(contentType.split(';')[0].trim());
        }
        
      } catch (err) {
        return res.status(400).json({ message: `Falha ao baixar imagem da URL` });
      }
      
    } else {
      return res.status(400).json({ message: 'Dados de imagem inválidos ou ausentes.' });
    }
    
    if (!extension) {
      return res.status(415).json({ message: 'Não foi possível determinar o formato.' });
    }
    
    // Deletar notas antigas
    await deletarNotasAntigas(id);
    
    // Gerar nome: notas_id_timestamp.ext
    const timestamp = Date.now();
    const filename = `notas_${id}_${timestamp}.${extension}`;
    const filePath = path.join(NOTAS_UPLOAD_DIR, filename);
    
    // Salvar arquivo
    await fs.mkdir(NOTAS_UPLOAD_DIR, { recursive: true });
    await fs.writeFile(filePath, Buffer.from(imageBuffer));
    
    // Atualizar caminho no banco
    const imagemPath = `/imagens/notas/${filename}`;
    await query(
      'UPDATE produto SET notas_olfativas_imagem = $1 WHERE id_produto = $2',
      [imagemPath, id]
    );
    
    console.log(`✅ Notas olfativas salvas: ${filename} para produto #${id}`);
    
    res.status(201).json({ 
      message: 'Notas olfativas salvas com sucesso!',
      filename,
      path: imagemPath,
      viewUrl: `/view-notas/${id}`
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar notas olfativas:', error);
    res.status(500).json({ message: 'Erro ao processar notas olfativas.' });
  }
};

// Visualizar notas olfativas (GET /view-notas/:produtoId)
const viewNotas = async (req, res) => {
  const { produtoId } = req.params;
  
  try {
    // Buscar caminho no banco
    const result = await query(
      'SELECT notas_olfativas_imagem FROM produto WHERE id_produto = $1',
      [produtoId]
    );
    
    if (result.rows.length > 0 && result.rows[0].notas_olfativas_imagem) {
      const imagemPath = result.rows[0].notas_olfativas_imagem;
      const filename = path.basename(imagemPath);
      const filePath = path.join(NOTAS_UPLOAD_DIR, filename);
      
      try {
        await fs.access(filePath);
        return res.sendFile(filePath);
      } catch {
        // Arquivo não existe, continuar
      }
    }
    
    // Fallback: procurar arquivo no diretório
    try {
      const files = await fs.readdir(NOTAS_UPLOAD_DIR);
      const notasFile = files.find(f => {
        const baseName = path.basename(f, path.extname(f));
        return baseName === `notas_${produtoId}` || baseName.startsWith(`notas_${produtoId}_`);
      });
      
      if (notasFile) {
        return res.sendFile(path.join(NOTAS_UPLOAD_DIR, notasFile));
      }
    } catch {}
    
    return res.status(404).json({ message: `Notas olfativas não encontradas para produto #${produtoId}` });
    
  } catch (error) {
    console.error('Erro ao buscar notas olfativas:', error);
    return res.status(500).json({ message: 'Erro ao buscar notas olfativas.' });
  }
};

// Deletar notas olfativas (DELETE /delete-notas/:produtoId)
const deleteNotas = async (req, res) => {
  const { produtoId } = req.params;
  
  try {
    const id = parseInt(produtoId, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: 'ID do Produto inválido.' });
    }
    
    const removidas = await deletarNotasAntigas(id);
    
    await query(
      'UPDATE produto SET notas_olfativas_imagem = NULL WHERE id_produto = $1',
      [id]
    );
    
    res.json({ message: `${removidas} notas removidas.`, count: removidas });
    
  } catch (error) {
    console.error('Erro ao deletar notas:', error);
    res.status(500).json({ message: 'Erro ao deletar notas.' });
  }
};

module.exports = { 
  ensureUploadDir, 
  uploadImage, 
  viewImage, 
  deleteImage,
  deletarImagemAntiga,
  // Notas olfativas
  uploadNotas,
  viewNotas,
  deleteNotas,
  deletarNotasAntigas,
  // Constantes
  UPLOAD_DIR,
  NOTAS_UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS
};
