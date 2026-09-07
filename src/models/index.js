const sequelize = require('../config/database');
const Conta = require('./Conta');
const Usuario = require('./Usuario');

const models = {
  Conta,
  Usuario,
};

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = {
  sequelize,
  ...models,
};
