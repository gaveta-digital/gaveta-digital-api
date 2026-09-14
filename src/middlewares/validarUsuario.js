const { z } = require('zod');

const nomeValidoRegex = /^[a-zA-ZÀ-ÿ\s\-']+$/;


const usuarioSchema = z.object({
    nome: z.string({ 
        required_error: "Nome é obrigatório", 
        invalid_type_error: "Nome deve ser uma string" 
    })
    .trim() // Remove os espaços das extremidades antes de validar o tamanho
    .min(2, "O nome deve ter no mínimo 2 caracteres")
    .max(100, "O nome deve ter no máximo 100 caracteres")
    .regex(nomeValidoRegex, "O nome contém caracteres inválidos"),


    email: z.string({ 
        required_error: "E-mail é obrigatório", 
        invalid_type_error: "E-mail deve ser uma string" 
    })
    .trim() // Remove espaços
    .toLowerCase() // Converte para minúsculas
    .email("E-mail em formato inválido"),

    senha: z.string({ 
        required_error: "Senha é obrigatória", 
        invalid_type_error: "Senha deve ser uma string" 
    })
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número")
});

const validarUsuario = (req, res, next) => {
    try {
        req.body = usuarioSchema.parse(req.body);
        next();
    }catch (erro) {
        // Se for erro de validação do Zod, pegamos a primeira mensagem de erro
        if (erro instanceof z.ZodError) {
            return res.status(400).json({
                erro: erro.issues[0].message
            });
        }
        
        // Qualquer outro erro
        return res.status(500).json({
            erro: erro.message || 'Erro interno no servidor'
        });
    }
};


module.exports = validarUsuario;