const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const { sequelize, Usuario } = require('../../src/models');

describe('Model Usuario', () => {
  before(async () => {
    // Sincronizar o banco de dados antes de executar a suíte de testes
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Limpar a tabela de contas antes de cada teste
    await Usuario.destroy({ truncate: true, force: true });
  });

  it('deve criar um usuário válido com sucesso e omitir a senha na consulta padrão', async () => {
    const dadosUsuario = {
      nome: 'João Silva',
      email: 'joao.silva@exemplo.com',
      senha: 'SenhaSegura123!',
    };

    const usuarioCriado = await Usuario.create(dadosUsuario);

    assert.ok(usuarioCriado.id, 'O id do usuário deve ter sido gerado');
    assert.strictEqual(usuarioCriado.nome, dadosUsuario.nome);
    assert.strictEqual(usuarioCriado.email, dadosUsuario.email);
    assert.strictEqual(usuarioCriado.tipo, 'USUARIO');

    // Buscar no banco via consulta padrão (defaultScope)
    const usuarioBuscado = await Usuario.findByPk(usuarioCriado.id);
    const usuarioJSON = usuarioBuscado.toJSON();

    // A senha NUNCA deve ser retornada em consultas padrão
    assert.strictEqual(usuarioJSON.senha, undefined, 'A senha não deve ser retornada na consulta padrão');

    // Testar o scope explicitado comSenha
    const usuarioComSenha = await Usuario.scope('comSenha').findByPk(usuarioCriado.id);
    assert.strictEqual(usuarioComSenha.senha, dadosUsuario.senha, 'A senha deve estar presente com scope comSenha');
  });

  it('deve retornar erro ao tentar criar usuário com e-mail duplicado', async () => {
    const dadosUsuario = {
      nome: 'Maria Souza',
      email: 'maria@exemplo.com',
      senha: 'senha123',
    };

    // Criar o primeiro usuário
    await Usuario.create(dadosUsuario);

    // Tentar criar segundo usuário com o mesmo e-mail
    await assert.rejects(
      async () => {
        await Usuario.create({
          nome: 'Maria Clone',
          email: 'maria@exemplo.com',
          senha: 'outrasenha',
        });
      },
      (err) => {
        return (
          err.name === 'SequelizeUniqueConstraintError' ||
          (err.errors && err.errors.some((e) => e.type === 'unique violation' || e.path === 'email'))
        );
      },
      'Deveria falhar devido à restrição de e-mail único'
    );
  });

  it('deve retornar erro ao tentar criar usuário com nome maior que 100 caracteres', async () => {
    const nomeLongo = 'A'.repeat(101);

    await assert.rejects(
      async () => {
        await Usuario.create({
          nome: nomeLongo,
          email: 'nomelongo@exemplo.com',
          senha: 'senha123',
        });
      },
      (err) => {
        return err.name === 'SequelizeValidationError';
      },
      'Deveria falhar devido ao tamanho do nome ser maior que 100 caracteres'
    );
  });

  it('deve retornar erro ao tentar criar usuário com formato de e-mail inválido', async () => {
    await assert.rejects(
      async () => {
        await Usuario.create({
          nome: 'Carlos',
          email: 'email-invalido-sem-arroba',
          senha: 'senha123',
        });
      },
      (err) => {
        return err.name === 'SequelizeValidationError';
      },
      'Deveria falhar devido ao formato inválido de e-mail'
    );
  });
});
