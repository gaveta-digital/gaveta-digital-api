jest.mock('fs/promises');

const fs = require('fs/promises');
const ArmazenamentoService = require('../ArmazenamentoService');

describe('ArmazenamentoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('remover', () => {
    test('apaga o arquivo da pasta de dados', async () => {
      fs.unlink.mockResolvedValueOnce();

      await ArmazenamentoService.remover('uploads/foto.jpg');

      expect(fs.unlink).toHaveBeenCalledTimes(1);
      expect(fs.unlink.mock.calls[0][0]).toMatch(/uploads[\\/]foto\.jpg$/);
    });

    test('não faz nada quando não há referência', async () => {
      await ArmazenamentoService.remover(null);

      expect(fs.unlink).not.toHaveBeenCalled();
    });

    test('ignora arquivo que já não existe (ENOENT)', async () => {
      fs.unlink.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      await expect(ArmazenamentoService.remover('uploads/sumiu.jpg')).resolves.toBeUndefined();
    });

    test('registra no log outros erros, sem quebrar', async () => {
      const espiao = jest.spyOn(console, 'error').mockImplementation(() => {});
      fs.unlink.mockRejectedValueOnce(Object.assign(new Error('sem permissão'), { code: 'EACCES' }));

      await expect(ArmazenamentoService.remover('uploads/foto.jpg')).resolves.toBeUndefined();

      expect(espiao).toHaveBeenCalled();
      espiao.mockRestore();
    });
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
