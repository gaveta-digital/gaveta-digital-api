const jwt = require('jsonwebtoken');

const autenticacao = (req, res, next) => {
    //1. Verificar se o token ta dentro do cabeçalho da autenticação
    const authHeader = req.headers['authorization'];
    //2. Se não tiver, barrar
    if(!authHeader) {
        return res.status(401).json({
            status: 'erro',
            mensagem: 'Token não fornecido'
        })
    }
    //3.Dividir o texto do cabeçalho em duas partes, e pegar a segunda parte (o token)
    //Explicar pra mim mesmo: primeira parte é o tipo de autenticação (Bearer), a segunda parte é o token em si, mas é como se fosse um array, então a gente pega a segunda parte com [1]
    const [, token] = authHeader.split(' ');
    try{
        //4. Jwt verifica se o token foi assinado
        //pela chave secreta que eu defini no .env, e se o token não foi expirado
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        //5. Se o token for válido, guardar id do usuário que estava dentro do token na requisição, assim o controller vai saber qual usuário está fazendo a requisição.
        req.usuarioId = decoded.id;
        //6. chamar next pro usuário passar
        next();
    } catch (erro){
        //Se o token for invalido, cai aqui
        return res.status(401).json({
            status: 'erro',
            mensagem: 'Token inválido ou expirado'
        })
    }

}


module.exports = autenticacao;