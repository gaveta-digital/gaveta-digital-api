const { sequelize, Usuario } = require('..');

describe('Model Usuario', () => {
	beforeAll(async () => {
		await sequelize.sync({ force: true });
	});

	beforeEach(async () => {
		await Usuario.destroy({ where: {}, truncate: true, force: true });
	});

	afterAll(async () => {
		await sequelize.close();
	});

	test('cria usuario valido, define o tipo e omite a senha na consulta padrao', async () => {
		const senha = 'SenhaSegura123!';
		const usuarioCriado = await Usuario.create({
			nome: 'Joao Silva',
			email: 'joao.silva@exemplo.com',
			senha,
		});

		expect(usuarioCriado.id).toBeDefined();
		expect(usuarioCriado.tipo).toBe('USUARIO');

		const usuarioBuscado = await Usuario.findByPk(usuarioCriado.id);
		expect(usuarioBuscado.toJSON()).not.toHaveProperty('senha');

		const usuarioComSenha = await Usuario.scope('comSenha').findByPk(usuarioCriado.id);
		expect(usuarioComSenha.senha).toBe(senha);
	});

	test.each([
		['nome ausente', { email: 'teste@exemplo.com', senha: '123456' }],
		['nome curto', { nome: 'J', email: 'teste@exemplo.com', senha: '123456' }],
		['nome longo', { nome: 'A'.repeat(101), email: 'teste@exemplo.com', senha: '123456' }],
		['email ausente', { nome: 'Joao', senha: '123456' }],
		['email invalido', { nome: 'Joao', email: 'invalido', senha: '123456' }],
		['senha ausente', { nome: 'Joao', email: 'teste@exemplo.com' }],
	])('rejeita %s', async (_caso, dadosUsuario) => {
		await expect(Usuario.create(dadosUsuario)).rejects.toThrow();
	});

	test('rejeita e-mail duplicado', async () => {
		await Usuario.create({ nome: 'Maria Souza', email: 'maria@exemplo.com', senha: 'senha123' });

		await expect(
			Usuario.create({ nome: 'Maria Clone', email: 'maria@exemplo.com', senha: 'outrasenha' })
		).rejects.toThrow();
	});
});
