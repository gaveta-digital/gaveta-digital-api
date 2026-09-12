const { sequelize, Usuario, Categoria, Comprovante } = require('..');

describe('Model Comprovante', () => {
  let usuario;
  let categoria;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await Comprovante.destroy({ where: {}, force: true });
    await Usuario.destroy({ where: {}, force: true });
    await Categoria.destroy({ where: {}, force: true });

    usuario = await Usuario.create({
      nome: 'Joao Silva',
      email: 'joao@exemplo.com',
      senha: 'SenhaSegura123!',
    });
    categoria = await Categoria.create({ nome: 'Transporte' });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('cria comprovante com todos os campos', async () => {
    const comprovante = await Comprovante.create({
      estabelecimento: 'Posto Central',
      data: '2026-09-11',
      valor: 25.5,
      imagemUrl: 'https://exemplo.com/comprovante.jpg',
      usuarioId: usuario.id,
      categoriaId: categoria.id,
    });

    expect(comprovante.id).toBeDefined();
    expect(comprovante.imagemUrl).toBe('https://exemplo.com/comprovante.jpg');
  });

  test('cria comprovante com estabelecimento, data e valor nulos', async () => {
    const comprovante = await Comprovante.create({
      estabelecimento: null,
      data: null,
      valor: null,
      imagemUrl: 'https://exemplo.com/comprovante-sem-dados.jpg',
      usuarioId: usuario.id,
      categoriaId: categoria.id,
    });

    expect(comprovante.id).toBeDefined();
    expect(comprovante.estabelecimento).toBeNull();
    expect(comprovante.data).toBeNull();
    expect(comprovante.valor).toBeNull();
  });

  test('rejeita comprovante sem imagemUrl', async () => {
    await expect(
      Comprovante.create({
        estabelecimento: 'Posto Central',
        data: '2026-09-11',
        valor: 25.5,
        usuarioId: usuario.id,
        categoriaId: categoria.id,
      })
    ).rejects.toThrow();
  });

  test('rejeita comprovante com valor negativo', async () => {
    await expect(
      Comprovante.create({
        valor: -10,
        imagemUrl: 'https://exemplo.com/comprovante-invalido.jpg',
        usuarioId: usuario.id,
        categoriaId: categoria.id,
      })
    ).rejects.toThrow();
  });
});
