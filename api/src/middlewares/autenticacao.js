const jwt = require('jsonwebtoken');

const autenticacao = (req, res, next) => {
    //1. Verificar se o token ta dentro do cabeçalho da autenticação
    const authHeader = req.headers['authorization'];
    //2. Se não tiver, barrar
    if(!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            erro: 'Token não fornecido ou malformado'
        })
    }
    //3.Dividir o texto do cabeçalho em duas partes, e pegar a segunda parte (o token)
    //Explicar pra mim mesmo: primeira parte é o tipo de autenticação (Bearer), a segunda parte é o token em si, mas é como se fosse um array, então a gente pega a segunda parte com [1]
    const [, token] = authHeader.split(' ');
    try{
        //4. Jwt verifica se o token foi assinado
        //pela chave secreta que eu defini no .env, e se o token não foi expirado
        if (!process.env.JWT_SECRET) {
            throw new Error('Chave JWT_SECRET não configurada no servidor');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        //5. Se o token for válido, guardar id do usuário que estava dentro do token na requisição, assim o controller vai saber qual usuário está fazendo a requisição.
        if (!decoded.id) {
            throw new Error('Payload inválido');
        }
        req.usuarioId = decoded.id;
        //6. chamar next pro usuário passar
        next();
    } catch (erro){
        return res.status(401).json({
            erro: 'Token inválido ou expirado'
        })
    }

}


module.exports = autenticacao;