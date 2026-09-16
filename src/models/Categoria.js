const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Normaliza o nome da categoria para fins de comparação e unicidade.
 * Remove espaços das extremidades, converte para minúsculas,
 * e remove caracteres acentuados.
 */
function normalizarNome(nome) {
  if (typeof nome !== 'string') return '';
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Valida o nome da categoria de acordo com as regras de negócio:
 * - Deve ser string
 * - De 1 a 50 caracteres após trim
 * - Não aceita vazio ou apenas espaços
 * - Deve conter pelo menos uma letra (incluindo acentuadas)
 */
function validarNomeCategoria(nome) {
  if (typeof nome !== 'string') {
    throw new Error('O nome da categoria deve ser um texto (string)');
  }
  const nomeTrimmed = nome.trim();
  if (nomeTrimmed.length < 1 || nomeTrimmed.length > 50) {
    throw new Error('O nome da categoria deve ter entre 1 e 50 caracteres');
  }
  if (!/[\p{L}]/u.test(nomeTrimmed)) {
    throw new Error('O nome da categoria deve conter pelo menos uma letra');
  }
  return nomeTrimmed;
}

class Categoria extends Model {
  static normalizarNome(nome) {
    return normalizarNome(nome);
  }

  static validarNome(nome) {
    return validarNomeCategoria(nome);
  }

  /**
   * Inicializa as 6 categorias padrão para um usuário específico.
   * Supõe receber o usuarioId do proprietário e opcionalmente uma transação.
   */
  static async seedIniciais(usuarioId, { transaction } = {}) {
    if (!usuarioId) {
      throw new Error('É necessário informar o usuarioId do proprietário para inicializar as categorias.');
    }

    const categoriasPadrao = [
      'Material',
      'Alimentação',
      'Transporte',
      'Serviços',
      'Equipamentos',
      'Outros',
    ];

    for (const nomeOriginal of categoriasPadrao) {
      const nomeNorm = normalizarNome(nomeOriginal);

      const existe = await Categoria.findOne({
        where: { usuarioId, nomeNormalizado: nomeNorm },
        transaction,
      });

      if (!existe) {
        await Categoria.create(
          {
            nome: nomeOriginal,
            nomeNormalizado: nomeNorm,
            usuarioId,
          },
          { transaction }
        );
      }
    }
  }
}

Categoria.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Campo 'nome': armazena a grafia original formatada (maiúsculas e acentos) para exibição
    nome: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        customValidate(value) {
          validarNomeCategoria(value);
        },
      },
    },
    // Campo 'nomeNormalizado': minúsculas, sem acentos e sem espaços para controle de unicidade por usuário
    nomeNormalizado: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'contas',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'Categoria',
    tableName: 'categorias',
    indexes: [
      {
        unique: true,
        fields: ['usuarioId', 'nomeNormalizado'],
      },
    ],
    hooks: {
      beforeValidate: (categoria) => {
        if (categoria.usuarioId === undefined || categoria.usuarioId === null) {
          throw new Error('A categoria deve pertencer a um usuário (proprietário)');
        }
        if (typeof categoria.nome === 'string') {
          categoria.nome = categoria.nome.trim();
          categoria.nomeNormalizado = normalizarNome(categoria.nome);
        }
      },
    },
  }
);

module.exports = Categoria;
module.exports.normalizarNome = normalizarNome;
module.exports.validarNomeCategoria = validarNomeCategoria;
