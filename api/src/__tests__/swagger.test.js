const request = require('supertest');
const swaggerSpec = require('../swagger');
const app = require('../app');

describe('Swagger', () => {
  test('usa um único servidor relativo, sem porta fixa', () => {
    expect(swaggerSpec.servers).toHaveLength(1);
    expect(swaggerSpec.servers[0].url).toBe('/api');
    expect(JSON.stringify(swaggerSpec.servers)).not.toMatch(/localhost|:\d{4}/);
  });

  test('os caminhos documentados não repetem o prefixo /api', () => {
    const caminhos = Object.keys(swaggerSpec.paths);

    expect(caminhos).toEqual(expect.arrayContaining(['/login', '/usuarios']));
    expect(caminhos.filter((caminho) => caminho.startsWith('/api'))).toEqual([]);
  });

  test('a página /api-docs entrega a especificação com o servidor /api', async () => {
    const pagina = await request(app).get('/api-docs/');
    const inicializacao = await request(app).get('/api-docs/swagger-ui-init.js');

    expect(pagina.status).toBe(200);
    expect(inicializacao.status).toBe(200);
    expect(inicializacao.text).toContain('"url": "/api"');
    expect(inicializacao.text).not.toContain('localhost:3000');
  });
});
