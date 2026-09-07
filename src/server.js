require('dotenv').config({
  path: '../.env'
});
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT;

async function bootstrap() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync();
      console.log('Banco de dados sincronizado.');
    }

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('[OLHE O .env POR VIA DAS DUVIDAS]\nNão foi possível conectar ao banco de dados ou iniciar o servidor:', error);
    process.exit(1);
  }
}

bootstrap();
