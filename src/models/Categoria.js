const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Categoria extends Model {
  static associate(models) {
    Categoria.hasMany(models.Comprovante, {
      foreignKey: 'categoriaId',
      as: 'comprovantes',
    });
  }

  static async seedIniciais() {
    const nomes = [
      'Material',
      'Alimentação',
      'Transporte',
      'Serviços',
      'Equipamentos',
      'Outros',
    ];

    for (const nome of nomes) {
      await Categoria.findOrCreate({ where: { nome, usuarioId: null } });
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
    nome: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Outros',
      validate: {
        len: {
          args: [1, 50],
          msg: 'O nome deve ter no máximo 50 caracteres',
        },
      },
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Categoria',
    tableName: 'categorias',
    indexes: [
      {
        unique: true,
        fields: ['nome', 'usuarioId'],
        msg: 'Categoria já cadastrada para este usuário',
      },
    ],
  }
);

module.exports = Categoria;
