const UsuarioService =  require('../services/UsuarioService.js')

const UsuarioController = {
    async criarUsuario(req, res, next) {
        try{
            //1. Desestruturar os dados do corpo da requisição
            const { nome, email, senha } = req.body;
            //2. Chamar o serviço para criar o usuário
            const usuarioCriado = await UsuarioService.criarUsuario(nome, email, senha);
            //3. Retornar a resposta com o usuário criado
            res.status(201).json({
                status: 'sucesso',
                data: usuarioCriado,
            });
        } catch(erro){
            //enviar o erro para o middleware de tratamento de erros
            next(erro);
        }
    },

    async loginUsuario(req, res, next){
        try{
            //1. desestruturar os dados do corpo da requisição
            const { email, senha } = req.body;

            //2. chamar o service para fazer o login
            //como a função retorna um objeto com usuario e token, vamos guardar o resultado em uma variável
            const {usuario, token} = await UsuarioService.loginUsuario(email, senha);
            
            //3. devolver a resposta com o token e os dados do usuário (sem a senha)
            res.status(200).json({
                status: 'sucesso',
                data: {
                    usuario,
                    token,
                },
            });

        } catch(erro){
            //enviar o erro para o middleware de tratamento de erros
            next(erro);
        }
    }
}


module.exports = UsuarioController;