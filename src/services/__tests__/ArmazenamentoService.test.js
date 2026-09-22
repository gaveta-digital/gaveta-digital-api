jest.mock('fs/promises');

const fs = require('fs/promises');
const ArmazenamentoService = require('../ArmazenamentoService');

describe('ArmazenamentoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('obterArquivo', () => {
    test('retorna null se a referência não for informada', async () => {
      const resultado = await ArmazenamentoService.obterArquivo(null);

      expect(resultado).toBeNull();
      expect(fs.access).not.toHaveBeenCalled();
    });

    test('retorna null se a referência tentar escapar do diretório de dados', async () => {
      const resultado = await ArmazenamentoService.obterArquivo('../../../etc/passwd');

      expect(resultado).toBeNull();
      expect(fs.access).not.toHaveBeenCalled();
    });

    test('retorna null se o arquivo não existir mais no disco', async () => {
      fs.access.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const resultado = await ArmazenamentoService.obterArquivo('uploads/inexistente.jpg');

      expect(resultado).toBeNull();
    });

    test('retorna caminho completo e mimetype correto para .jpg', async () => {
      fs.access.mockResolvedValueOnce();

      const resultado = await ArmazenamentoService.obterArquivo('uploads/foto.jpg');

      expect(resultado.mimeType).toBe('image/jpeg');
      expect(resultado.caminhoCompleto).toMatch(/uploads[\\/]foto\.jpg$/);
    });

    test('retorna mimetype correto para .png e .webp', async () => {
      fs.access.mockResolvedValue();

      const png = await ArmazenamentoService.obterArquivo('uploads/foto.png');
      expect(png.mimeType).toBe('image/png');

      const webp = await ArmazenamentoService.obterArquivo('uploads/foto.webp');
      expect(webp.mimeType).toBe('image/webp');
    });

    test('usa application/octet-stream para extensão desconhecida', async () => {
      fs.access.mockResolvedValueOnce();

      const resultado = await ArmazenamentoService.obterArquivo('uploads/arquivo.bin');

      expect(resultado.mimeType).toBe('application/octet-stream');
    });
  });
});
