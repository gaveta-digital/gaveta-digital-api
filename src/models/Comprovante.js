const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Comprovante extends Model {}

Comprovante.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    estabelecimento: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    data: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    imagemUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    categoriaId: {
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
