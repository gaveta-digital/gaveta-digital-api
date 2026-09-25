const { sequelize, Usuario } = require('../index');

describe('Model Usuario', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await Usuario.destroy({ truncate: true, force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('deve criar usuário com dados válidos e omitir a senha na consulta padrão', async () => {
    const dadosUsuario = {
      nome: 'João Silva',
      email: 'joao.silva@exemplo.com',
      senha: 'SenhaSegura123!',
    };

    const usuarioCriado = await Usuario.create(dadosUsuario);

    expect(usuarioCriado.id).toBeDefined();
    expect(usuarioCriado.nome).toBe(dadosUsuario.nome);
    expect(usuarioCriado.email).toBe(dadosUsuario.email);
    expect(usuarioCriado.tipo).toBe('USUARIO');

    // Buscar no banco via consulta padrão (defaultScope)
    const usuarioBuscado = await Usuario.findByPk(usuarioCriado.id);
    const usuarioJSON = usuarioBuscado.toJSON();

    // A senha NUNCA deve ser retornada em consultas padrão
    expect(usuarioJSON.senha).toBeUndefined();

    // Scope comSenha
    const usuarioComSenha = await Usuario.scope('comSenha').findByPk(usuarioCriado.id);
    expect(usuarioComSenha.senha).toBe(dadosUsuario.senha);
  });

  test('não deve permitir e-mail duplicado', async () => {
    const dadosUsuario = {
      nome: 'Maria Souza',
      email: 'maria@exemplo.com',
      senha: 'senha123',
    };

    await Usuario.create(dadosUsuario);

    await expect(
      Usuario.create({
        nome: 'Maria Clone',
        email: 'maria@exemplo.com',
        senha: 'outrasenha',
      })
    ).rejects.toThrow();
  });

  test('deve rejeitar nome com menos de 2 caracteres ou mais de 100 caracteres', async () => {
    await expect(
      Usuario.create({
        nome: 'J',
        email: 'j@exemplo.com',
        senha: 'senha123',
      })
    ).rejects.toThrow();

    const nomeLongo = 'A'.repeat(101);
    await expect(
      Usuario.create({
        nome: nomeLongo,
        email: 'nomelongo@exemplo.com',
        senha: 'senha123',
      })
    ).rejects.toThrow();
  });

  test('deve rejeitar formato de e-mail inválido', async () => {
    await expect(
      Usuario.create({
        nome: 'Carlos',
        email: 'email-invalido-sem-arroba',
        senha: 'senha123',
      })
    ).rejects.toThrow();
  });
});
