const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Comprovante extends Model {
  static associate(models) {
    Comprovante.belongsTo(models.Usuario, {
      foreignKey: 'usuarioId',
      as: 'usuario',
    });

    Comprovante.belongsTo(models.Categoria, {
      foreignKey: 'categoriaId',
      as: 'categoria',
    });
  }
}

Comprovante.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    estabelecimento: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    data: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        maiorQueZero(value) {
          if (value !== null && Number(value) <= 0) {
            throw new Error('O valor deve ser maior que zero');
          }
        },
      },
    },
    categoriaId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    imagemUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Comprovante',
    tableName: 'comprovantes',
  }
);

module.exports = Comprovante;
