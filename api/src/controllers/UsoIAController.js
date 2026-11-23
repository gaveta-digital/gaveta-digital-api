const UsoIAService = require('../services/UsoIAService');

const UsoIAController = {
  async resumo(req, res, next) {
    try {
      const resumo = await UsoIAService.resumo(req.usuarioId);

      return res.status(200).json({
        status: 'sucesso',
        data: resumo,
      });
    } catch (erro) {
      return next(erro);
    }
  },
};

module.exports = UsoIAController;
