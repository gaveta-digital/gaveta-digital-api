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
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Desenvolvimento',
      },
      {
        url: 'http://localhost:8080/api',
        description: 'Docker',
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
