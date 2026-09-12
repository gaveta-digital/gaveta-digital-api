const { sequelize, Categoria } = require('..');

describe('Model Categoria', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await Categoria.seedIniciais();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('cria categoria valida', async () => {
    const categoria = await Categoria.create({ nome: 'Saude' });

    expect(categoria.id).toBeDefined();
    expect(categoria.nome).toBe('Saude');
  });

  test('usa Outros quando o nome nao e informado', async () => {
    const categoria = await Categoria.create({});

    expect(categoria.nome).toBe('Outros');
  });

  test('rejeita categoria com nome duplicado', async () => {
    await expect(Categoria.create({ nome: 'Saude' })).rejects.toThrow();
  });

  test('mantem Outros apos o seed', async () => {
    const outros = await Categoria.findOne({ where: { nome: 'Outros' } });

    expect(outros).not.toBeNull();
  });
});