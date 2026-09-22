const ComprovanteService = require('../services/ComprovanteService');

function tratarErroConhecido(erro, res, next) {
  if (erro.statusCode) {
    return res.status(erro.statusCode).json({ erro: erro.message });
  }

  return next(erro);
}

const ComprovanteController = {
  async criar(req, res, next) {
    try {
      const comprovante = await ComprovanteService.criarComIA(
        req.usuarioId,
        req.file
      );

      return res.status(201).json({
        status: 'sucesso',
        data: comprovante,
      });
    } catch (erro) {
      return tratarErroConhecido(erro, res, next);
    }
  },

  async listar(req, res, next) {
    try {
      const comprovantes = await ComprovanteService.listar(
        req.usuarioId,
        req.query || {}
      );

      return res.status(200).json({
        status: 'sucesso',
        data: comprovantes,
      });
    } catch (erro) {
      return tratarErroConhecido(erro, res, next);
    }
  },

  async detalhar(req, res, next) {
    try {
      const comprovante = await ComprovanteService.detalhar(
        req.params.id,
        req.usuarioId
      );

      return res.status(200).json({
        status: 'sucesso',
        data: comprovante,
      });
    } catch (erro) {
      return tratarErroConhecido(erro, res, next);
    }
  },

  async imagem(req, res, next) {
    try {
      const { caminhoCompleto, mimeType } = await ComprovanteService.obterImagem(
        req.params.id,
        req.usuarioId
      );

      res.type(mimeType);
      return res.sendFile(caminhoCompleto);
    } catch (erro) {
      return tratarErroConhecido(erro, res, next);
    }
  },

  async editar(req, res, next) {
    try {
      const comprovante = await ComprovanteService.editar(
        req.params.id,
        req.usuarioId,
        req.body
      );

      return res.status(200).json({
        status: 'sucesso',
        data: comprovante,
      });
    } catch (erro) {
      return tratarErroConhecido(erro, res, next);
    }
  },

  async excluir(req, res, next) {
    try {
      await ComprovanteService.excluir(req.params.id, req.usuarioId);
      return res.status(204).send();
    } catch (erro) {
      return tratarErroConhecido(erro, res, next);
    }
  },
};

module.exports = ComprovanteController;
