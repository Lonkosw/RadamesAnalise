const express = require('express');
const router = express.Router();
const multer = require('multer');
const imageController = require('../controllers/imageController.js');

// Configuração do Multer para upload em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: imageController.MAX_FILE_SIZE || 2 * 1024 * 1024 // 2MB padrão
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato não suportado. Use: PNG, JPG ou WEBP'), false);
    }
  }
});

// Middleware para garantir diretório de upload existe
router.use(imageController.ensureUploadDir);

// =============================================================================
// IMAGENS DE PRODUTO (capa)
// =============================================================================

// POST /upload-image - Upload de nova imagem
router.post('/upload-image', upload.single('imageFile'), imageController.uploadImage);

// GET /view-image/:produtoId - Visualizar imagem
router.get('/view-image/:produtoId', imageController.viewImage);

// DELETE /delete-image/:produtoId - Deletar imagem
router.delete('/delete-image/:produtoId', imageController.deleteImage);

// =============================================================================
// NOTAS OLFATIVAS
// =============================================================================

// POST /upload-notas - Upload de imagem de notas olfativas
router.post('/upload-notas', upload.single('imageFile'), imageController.uploadNotas);

// GET /view-notas/:produtoId - Visualizar notas olfativas
router.get('/view-notas/:produtoId', imageController.viewNotas);

// DELETE /delete-notas/:produtoId - Deletar notas olfativas
router.delete('/delete-notas/:produtoId', imageController.deleteNotas);

module.exports = router;
