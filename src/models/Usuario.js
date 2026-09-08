const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Conta = require('./Conta');

class Usuario extends Conta {}

Usuario.init(
  {
    ...Conta.contaAttributes,
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [2, 100],
          msg: 'O nome deve ter entre 2 e 100 caracteres',
        },
      },
    },
  },
  {
    sequelize,
    modelName: 'Usuario',
    tableName: 'contas',
    defaultScope: {
      attributes: { exclude: ['senha'] },
      where: { tipo: 'USUARIO' },
    },
    scopes: {
      comSenha: {
        attributes: {},
        where: { tipo: 'USUARIO' },
      },
    },
    hooks: {
      beforeValidate: (usuario) => {
        usuario.tipo = 'USUARIO';
      },
    },
  }
);

module.exports = Usuario;
