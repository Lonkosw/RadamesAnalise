const express = require('express');
const router = express.Router();
const multer = require('multer');
const imageController = require('../controllers/imageController.js');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(imageController.ensureUploadDir);
router.post('/upload-image', upload.single('imageFile'), imageController.uploadImage);
router.get('/view-image/:produtoId', imageController.viewImage);

module.exports = router;
