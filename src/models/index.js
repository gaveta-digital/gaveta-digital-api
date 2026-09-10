const sequelize = require('../config/database');
const Conta = require('./Conta');
const Usuario = require('./Usuario');
const Categoria = require('./Categoria');
const Comprovante = require('./Comprovante');

// Associações
Usuario.hasMany(Comprovante, { foreignKey: 'usuarioId', as: 'comprovantes' });
Comprovante.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

Categoria.hasMany(Comprovante, { foreignKey: 'categoriaId', as: 'comprovantes' });
Comprovante.belongsTo(Categoria, { foreignKey: 'categoriaId', as: 'categoria' });

const models = {
  Conta,
  Usuario,
  Categoria,
  Comprovante,
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
