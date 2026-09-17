const sequelize = require('../config/database');
const Conta = require('./Conta');
const Usuario = require('./Usuario');
const Categoria = require('./Categoria');
const Comprovante = require('./Comprovante');

const models = {
  Conta,
  Usuario,
  Categoria,
  Comprovante,
};

// Configurar associações dos modelos
Usuario.hasMany(Categoria, { foreignKey: 'usuarioId', as: 'categorias' });
Conta.hasMany(Categoria, { foreignKey: 'usuarioId', as: 'categorias' });
Categoria.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = {
  sequelize,
  ...models,
};
