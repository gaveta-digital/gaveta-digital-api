const bcrypt = require('bcrypt');
const Usuario = require ('../models/Usuario')

const saltRounds = 10;

const UsuarioService = async (nome, email, senha) => {
    //1.Verificar se o email existe
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
        throw new Error('Email já cadastrado');
    }

    //2.Gerar hash da senha
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    //3. Criari usuário

    const novoUsuario = await Usuario.create({ nome, email, senha: senhaHash });

    //4. Retornar usuário criado
    const usuarioSemSenha = novoUsuario.toJSON();
    delete usuarioSemSenha.senha;
    return usuarioSemSenha;
}

module.exports = UsuarioService;