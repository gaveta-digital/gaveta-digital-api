const UsuarioService =  require('../services/UsuarioService.js')

const UsuarioController = {
    async criarUsuario(req, res, next) {
        try{
            //1. Desestruturar os dados do corpo da requisição
            const { nome, email, senha } = req.body;
            //2. Chamar o serviço para criar o usuário
            const usuarioCriado = await UsuarioService(nome, email, senha);
            //3. Retornar a resposta com o usuário criado
            res.status(201).json({
                status: 'sucesso',
                data: usuarioCriado,
            });
        } catch(erro){
            //enviar o erro para o middleware de tratamento de erros
            next(erro);
        }
    }
}


module.exports = UsuarioController;