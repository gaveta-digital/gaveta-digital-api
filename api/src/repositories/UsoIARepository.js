const { fn, col } = require('sequelize');
const { UsoIA } = require('../models');

const UsoIARepository = {
  async criarVarios(registros) {
    return UsoIA.bulkCreate(registros);
  },

  // uma linha por modelo, com a contagem de tentativas e a soma dos tokens
  async somarPorModelo(usuarioId) {
    return UsoIA.findAll({
      attributes: [
        'modelo',
        [fn('COUNT', col('id')), 'tentativas'],
        [fn('SUM', col('tokensEntrada')), 'tokensEntrada'],
        [fn('SUM', col('tokensSaida')), 'tokensSaida'],
        [fn('SUM', col('tokensTotal')), 'tokensTotal'],
      ],
      where: { usuarioId },
      group: ['modelo'],
      order: [['modelo', 'ASC']],
      raw: true,
    });
  },

  async ultimas(usuarioId, limite) {
    return UsoIA.findAll({
      where: { usuarioId },
      order: [['createdAt', 'DESC'], ['id', 'ASC']],
      limit: limite,
    });
  },
};

module.exports = UsoIARepository;
