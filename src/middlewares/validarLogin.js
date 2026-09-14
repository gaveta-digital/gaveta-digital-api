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
        if (erro instanceof z.ZodError) {
            return res.status(400).json({
                erro: erro.issues[0].message
            });
        }
        
        return res.status(500).json({
            erro: erro.message || 'Erro interno no servidor'
        });
    }
};

module.exports = validarLogin;