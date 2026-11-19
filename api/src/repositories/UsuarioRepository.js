const { Usuario } = require('../models');

const UsuarioRepository = {
  async findByEmail(email) {
    return Usuario.findOne({ where: { email } });
  },

  async findByEmailComSenha(email) {
    return Usuario.scope('comSenha').findOne({ where: { email } });
  },

  async create(dados, opcoes = {}) {
    return Usuario.create(dados, opcoes);
  },
};

module.exports = UsuarioRepository;
