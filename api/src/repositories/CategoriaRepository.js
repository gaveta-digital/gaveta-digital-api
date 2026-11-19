const { Categoria } = require('../models');

const CategoriaRepository = {
  async create(dados) {
    return Categoria.create(dados);
  },

  async findAllByUsuario(usuarioId) {
    return Categoria.findAll({ where: { usuarioId } });
  },

  async findByIdAndUsuario(id, usuarioId) {
    return Categoria.findOne({ where: { id, usuarioId } });
  },

  async findById(id) {
    return Categoria.findByPk(id);
  },
};

module.exports = CategoriaRepository;
