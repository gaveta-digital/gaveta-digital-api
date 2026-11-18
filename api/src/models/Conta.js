const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const contaAttributes = {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      msg: 'E-mail já cadastrado',
    },
    validate: {
      isEmail: {
        msg: 'Formato de e-mail inválido',
      },
    },
  },
  senha: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'CONTA',
  },
};

class Conta extends Model {}

Conta.init(contaAttributes, {
  sequelize,
  modelName: 'Conta',
  tableName: 'contas',
  defaultScope: {
    attributes: { exclude: ['senha'] },
  },
  scopes: {
    comSenha: {
      attributes: {},
    },
  },
});

module.exports = Conta;
module.exports.contaAttributes = contaAttributes;
