const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const DIRETORIO_DADOS = path.resolve(__dirname, '../../data');
const DIRETORIO_UPLOADS = path.join(DIRETORIO_DADOS, 'uploads');

const EXTENSOES_POR_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MIME_POR_EXTENSAO = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
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

  async obterArquivo(referencia) {
    if (!referencia) {
      return null;
    }

    const caminhoCompleto = path.resolve(DIRETORIO_DADOS, referencia);

    // Nunca deixa a referência escapar do diretório de dados
    // (defesa contra path traversal via um imagemUrl malformado).
    if (!caminhoCompleto.startsWith(DIRETORIO_DADOS + path.sep)) {
      return null;
    }

    try {
      await fs.access(caminhoCompleto);
    } catch {
      return null;
    }

    const extensao = path.extname(caminhoCompleto).slice(1).toLowerCase();
    const mimeType = MIME_POR_EXTENSAO[extensao] || 'application/octet-stream';

    return { caminhoCompleto, mimeType };
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
