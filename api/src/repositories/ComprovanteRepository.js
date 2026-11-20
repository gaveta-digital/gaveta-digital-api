const { Op, literal } = require('sequelize');
const { Comprovante } = require('../models');

// escapa os caracteres especiais do LIKE para que o termo digitado seja
// tratado como texto literal, não como padrão (combinado com ESCAPE '\' na query)
function escaparTermoBusca(texto) {
  return texto.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

const ComprovanteRepository = {
  async create(dados) {
    return Comprovante.create(dados);
  },

  async findById(id) {
    return Comprovante.findByPk(id);
  },

  async findAllByUsuario(usuarioId, { limite, offset, categoriaId, busca } = {}) {
    const condicoes = { usuarioId };
    if (categoriaId) {
      condicoes.categoriaId = categoriaId;
    }

    const opcoes = {
      order: [['createdAt', 'DESC']],
      limit: limite,
      offset,
    };

    if (busca) {
      const termoBusca = `%${escaparTermoBusca(busca.toLowerCase())}%`;
      opcoes.where = {
        [Op.and]: [
          condicoes,
          literal(
            "(LOWER(estabelecimento) LIKE :termoBusca ESCAPE '\\' OR LOWER(observacoes) LIKE :termoBusca ESCAPE '\\')"
          ),
        ],
      };
      opcoes.replacements = { termoBusca };
    } else {
      opcoes.where = condicoes;
    }

    return Comprovante.findAll(opcoes);
  },

  async findAllByUsuarioComCategoria(usuarioId) {
    return Comprovante.findAll({
      where: { usuarioId },
      include: [{ association: 'categoria', attributes: ['id', 'nome'] }],
    });
  },

  async countByCategoria(categoriaId) {
    return Comprovante.count({ where: { categoriaId } });
  },
};

module.exports = ComprovanteRepository;
