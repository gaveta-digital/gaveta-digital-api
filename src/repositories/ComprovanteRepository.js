const { Comprovante } = require('../models');

const ComprovanteRepository = {
  async create(dados) {
    return Comprovante.create(dados);
  },

  async findById(id) {
    return Comprovante.findByPk(id);
  },

  async findAllByUsuario(usuarioId, { limite, offset }) {
    return Comprovante.findAll({
      where: { usuarioId },
      order: [['createdAt', 'DESC']],
      limit: limite,
      offset,
    });
  },

  async countByCategoria(categoriaId) {
    return Comprovante.count({ where: { categoriaId } });
  },
};

module.exports = ComprovanteRepository;
