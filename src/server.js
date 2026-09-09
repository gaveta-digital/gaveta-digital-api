require('dotenv').config({
  path: '../.env'
});
const app = require('./app');
const { sequelize, Categoria } = require('./models');

const PORT = process.env.PORT;

async function bootstrap() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync();
      await Categoria.seedIniciais();
      console.log('Banco de dados sincronizado.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 API rodando em http://localhost:${PORT}/api/teste`);
    });
  } catch (error) {
    console.error('[OLHE O .env POR VIA DAS DUVIDAS]\nNão foi possível conectar ao banco de dados ou iniciar o servidor:', error);
    process.exit(1);
  }
}

bootstrap();
