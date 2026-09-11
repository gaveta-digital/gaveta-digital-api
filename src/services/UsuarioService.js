const bcrypt = require('bcryptjs');
const Usuario = require ('../models/Usuario')
const jwt = require('jsonwebtoken');

const saltRounds = 10;

const UsuarioService ={

    async criarUsuario(nome, email, senha) {
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
    },

    async loginUsuario(email, senha) {
        //1.Verificar se o email existe
        const usuarioExistente = await Usuario.scope('comSenha').findOne({ where: { email } });
        if (!usuarioExistente) {
            throw new Error('Usuario não encontrado');
        }

        //2. Comparar a senha fornecida com a senha armazenada
        const senhaValida = await bcrypt.compare(senha, usuarioExistente.senha);
        if (!senhaValida) {
            throw new Error('email ou senha incorreta');
        }

        //3. gerar token JWT (JSON Web Token) para autenticação

        const token = jwt.sign(
            {id: usuarioExistente.id},
            process.env.JWT_SECRET || 'segredo', // lembrar de falar pro pessoal colocar a chave no .env enquanto n tiver em prod.
            {expiresIn: '1d'} // token expira em 1 dia
        );
        
        //4. Retornar o token e os dados do usuário (sem a senha)
        const usuarioSemSenha = usuarioExistente.toJSON();
        delete usuarioSemSenha.senha;
        return { token, usuario: usuarioSemSenha };
    }
}


module.exports = UsuarioService;