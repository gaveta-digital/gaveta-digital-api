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
    const categoria = await Categoria.create({ nome: 'Saude', usuarioId: '123e4567-e89b-12d3-a456-426614174000' });

    expect(categoria.id).toBeDefined();
    expect(categoria.nome).toBe('Saude');
  });

  test('usa Outros quando o nome nao e informado', async () => {
    const categoria = Categoria.build({});

    expect(categoria.nome).toBe('Outros');
  });

  test('rejeita categoria com nome duplicado para o mesmo usuario', async () => {
    const usuarioId = '123e4567-e89b-12d3-a456-426614174001';
    await Categoria.create({ nome: 'Duplicada', usuarioId });
    await expect(Categoria.create({ nome: 'Duplicada', usuarioId })).rejects.toThrow();
  });

  test('permite categoria com mesmo nome para usuarios diferentes', async () => {
    const nome = 'Compartilhada';
    await Categoria.create({ nome, usuarioId: '123e4567-e89b-12d3-a456-426614174002' });
    const cat2 = await Categoria.create({ nome, usuarioId: '123e4567-e89b-12d3-a456-426614174003' });

    expect(cat2.id).toBeDefined();
  });

  test('mantem Outros apos o seed', async () => {
    const outros = await Categoria.findOne({ where: { nome: 'Outros' } });

    expect(outros).not.toBeNull();
  });
});
