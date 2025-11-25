const path = require('path');
const fs = require('fs/promises');
const axios = require('axios');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'imagens', 'produto');

const ensureUploadDir = async (_req, res, next) => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    next();
  } catch (error) {
    console.error('Erro ao criar diretório de upload:', error);
    res.status(500).json({ error: 'Erro de configuração do servidor.' });
  }
};

const uploadImage = async (req, res) => {
  try {
    const { produtoId, imageSource, imageUrl } = req.body;
    if (!produtoId) return res.status(400).json({ message: 'ID do Produto é obrigatório.' });
    let imageBuffer;
    let contentType = null;
    if (imageSource === 'local' && req.file) {
      imageBuffer = req.file.buffer;
      contentType = req.file.mimetype || null;
    } else if (imageSource === 'url' && imageUrl) {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      imageBuffer = response.data;
      contentType = response.headers['content-type'] || null;
    } else {
      return res.status(400).json({ message: 'Dados de imagem inválidos ou ausentes.' });
    }
    // Aceitar apenas PNG para evitar dependências nativas (canvas)
    const isPng = (contentType && contentType.toLowerCase().includes('image/png'))
      || (req.file && req.file.originalname && req.file.originalname.toLowerCase().endsWith('.png'));
    if (!isPng) {
      return res.status(415).json({ message: 'Apenas imagens PNG são suportadas neste ambiente.' });
    }
    const outBuffer = Buffer.from(imageBuffer);
    const filename = `${produtoId}.png`;
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, filename), outBuffer);
    res.status(201).json({ message: 'Imagem processada e salva com sucesso.', filename });
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    let errorMessage = 'Erro ao processar a imagem.';
    if (error.response && error.response.status) errorMessage = `Falha ao baixar imagem (HTTP ${error.response.status}).`;
    res.status(500).json({ message: errorMessage, error: error.message, code: error.code });
  }
};

const viewImage = async (req, res) => {
  const { produtoId } = req.params;
  const filename = `${produtoId}.png`;
  const filePath = path.join(UPLOAD_DIR, filename);
  try {
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (error) {
    return res.status(404).json({ message: `Imagem para o Produto ID ${produtoId} não encontrada.` });
  }
};

module.exports = { ensureUploadDir, uploadImage, viewImage };
