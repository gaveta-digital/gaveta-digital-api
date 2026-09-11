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
        // Verifica se o erro foi disparado pelo Zod (erro de validação)
        if (erro instanceof z.ZodError) {
            return res.status(400).json({
                status: 'erro',
                mensagens: erro.issues.map(e => e.message)
            });
        }
        
        // Se for qualquer outro erro bizarro no sistema, devolve 500
        return res.status(500).json({
            status: 'erro',
            mensagem: erro.message || 'Erro interno no servidor'
        });
    }
};

module.exports = validarLogin;