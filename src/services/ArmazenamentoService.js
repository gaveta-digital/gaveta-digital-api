const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const DIRETORIO_UPLOADS = path.resolve(__dirname, '../../data/uploads');

const EXTENSOES_POR_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const ArmazenamentoService = {
  async salvar(buffer, mimeType) {
    await fs.mkdir(DIRETORIO_UPLOADS, { recursive: true });

    const extensao = EXTENSOES_POR_MIME[mimeType] || 'bin';
    const nomeArquivo = `${randomUUID()}.${extensao}`;
    const caminhoCompleto = path.join(DIRETORIO_UPLOADS, nomeArquivo);

    await fs.writeFile(caminhoCompleto, buffer);

    return `uploads/${nomeArquivo}`;
  },

  async remover(referencia) {
    if (!referencia) {
      return;
    }

    const caminhoCompleto = path.resolve(__dirname, '../../data', referencia);

    try {
      await fs.unlink(caminhoCompleto);
    } catch (erro) {
      if (erro.code !== 'ENOENT') {
        console.error(`[Armazenamento] Falha ao remover ${referencia}:`, erro.message);
      }
    }
  },
};

module.exports = ArmazenamentoService;
