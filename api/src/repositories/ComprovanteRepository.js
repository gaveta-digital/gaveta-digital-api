const { Comprovante } = require('../models');

// A comparação é feita em JavaScript porque o LOWER()/LIKE do SQLite só ignora
// maiúsculas em letras ASCII: "CAFÉ" não casaria com a busca "café". O
// toLowerCase() do JS trata letras acentuadas e dispensa escapar %, _ e \, já
// que o termo é comparado como texto literal.
function contemTexto(valor, termo) {
  return typeof valor === 'string' && valor.toLowerCase().includes(termo);
}

const ComprovanteRepository = {
  async create(dados) {
    return Comprovante.create(dados);
  },

  async findById(id) {
    return Comprovante.findByPk(id);
  },

  async findAllByUsuario(usuarioId, { limite, offset, categoriaId, busca } = {}) {
    const where = { usuarioId };
    if (categoriaId) {
      where.categoriaId = categoriaId;
    }

    const opcoes = { where, order: [['createdAt', 'DESC']] };

    if (!busca) {
      return Comprovante.findAll({ ...opcoes, limit: limite, offset });
    }

    // Com busca, filtra primeiro e só depois pagina, para a página refletir
    // o resultado já filtrado.
    const termo = busca.toLowerCase();
    const encontrados = (await Comprovante.findAll(opcoes)).filter(
      (comprovante) => contemTexto(comprovante.estabelecimento, termo)
        || contemTexto(comprovante.observacoes, termo)
    );

    const inicio = offset || 0;
    return encontrados.slice(inicio, limite === undefined ? undefined : inicio + limite);
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
