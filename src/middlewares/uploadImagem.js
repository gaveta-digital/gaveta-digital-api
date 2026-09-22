const multer = require('multer');

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10 MiB

function criarErro(statusCode, mensagem) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  return erro;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO_BYTES },
  fileFilter(req, file, callback) {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      return callback(
        criarErro(415, 'Formato não suportado. Envie uma imagem JPEG, PNG ou WebP.')
      );
    }
    callback(null, true);
  },
});

function uploadImagem(req, res, next) {
  upload.single('imagem')(req, res, (erro) => {
    if (erro instanceof multer.MulterError) {
      if (erro.code === 'LIMIT_FILE_SIZE') {
        return next(criarErro(413, 'A imagem deve ter no máximo 10 MiB.'));
      }
      return next(criarErro(400, erro.message));
    }

    if (erro) {
      return next(erro);
    }

    if (!req.file) {
      return next(criarErro(400, 'Envie uma imagem do comprovante.'));
    }

    next();
  });
}

module.exports = uploadImagem;
