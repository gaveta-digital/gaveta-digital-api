const bcrypt = require('bcryptjs');
const {sequelize, Usuario, Categoria} = require('../models');
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
    
        //3. Criar usuário e categorias iniciais dentro de uma Transação
        const novoUsuario = await sequelize.transaction(async (t) => {
            // Cria o usuário vinculando-o a esta transação
            const user = await Usuario.create({ nome, email, senha: senhaHash }, { transaction: t });
            
            // Chama a inicialização das 6 categorias usando a mesma transação
            if (Categoria.seedIniciais) {
                await Categoria.seedIniciais(user.id, { transaction: t });
            }
            
            return user;
        });
    
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

        if (!process.env.JWT_SECRET) {
            throw new Error('Chave JWT_SECRET não configurada no servidor');
        }

        const token = jwt.sign(
            {id: usuarioExistente.id},
            process.env.JWT_SECRET,
            {expiresIn: '1d'}
        );
        
        //4. Retornar o token e os dados do usuário (sem a senha)
        const usuarioSemSenha = usuarioExistente.toJSON();
        delete usuarioSemSenha.senha;
        return { token, usuario: usuarioSemSenha };
    }
}


module.exports = UsuarioService;