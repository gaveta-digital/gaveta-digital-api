const { z } = require('zod');

const loginSchema = z.object({
    email: z.string({ 
        required_error: "E-mail é obrigatório", 
        invalid_type_error: "E-mail deve ser uma string" 
    })
    .trim() 
    .toLowerCase() 
    .email("E-mail em formato inválido"),

    senha: z.string({ 
        required_error: "Senha é obrigatória", 
        invalid_type_error: "Senha deve ser uma string" 
    })
    });

    const validarLogin = (req, res, next) => {
    try {
    req.body = loginSchema.parse(req.body);
    next();
    } catch (erro) {
    return res.status(400).json({
        status: 'erro',
        mensagens: erro.errors.map(e => e.message)
    });
    }
};

module.exports = validarLogin;