const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Categoria extends Model {
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
      await Categoria.findOrCreate({ where: { nome } });
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
      unique: {
        msg: 'Categoria já cadastrada',
      },
      validate: {
        len: {
          args: [1, 50],
          msg: 'O nome deve ter no máximo 50 caracteres',
        },
      },
    },
  },
  {
    sequelize,
    modelName: 'Categoria',
    tableName: 'categorias',
  }
);

module.exports = Categoria;
