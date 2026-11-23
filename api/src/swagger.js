const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gaveta Digital API',
      version: '1.0.0',
      description: 'API para gerenciar comprovantes e categorias de despesas',
      contact: {
        name: 'Gaveta Digital',
        url: 'https://github.com/gaveta-digital/gaveta-digital-api',
      },
    },
    // Servidor relativo: o Swagger chama sempre o mesmo endereço em que a
    // página /api-docs foi aberta (localhost, IP da rede ou outra porta), sem
    // depender da porta do .env e sem problema de CORS entre origens.
    servers: [
      {
        url: '/api',
        description: 'Servidor atual (o mesmo endereço desta página)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

module.exports = swaggerJsdoc(options);
