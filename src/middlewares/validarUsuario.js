const { z } = require('zod');

// Regex para garantir que tenha pelo menos uma letra (incluindo acentuadas)
const contemLetraRegex = /[a-zA-ZÀ-ÿ]/;
// Regex para garantir que NÃO tenha nenhum número
const semNumeroRegex = /^[^0-9]*$/;

const usuarioSchema = z.object({
    nome: z.string({ 
        required_error: "Nome é obrigatório", 
        invalid_type_error: "Nome deve ser uma string" 
    })
    .trim() // Remove os espaços das extremidades antes de validar o tamanho
    .min(2, "O nome deve ter no mínimo 2 caracteres")
    .max(100, "O nome deve ter no máximo 100 caracteres")
    .regex(contemLetraRegex, "O nome deve conter pelo menos uma letra")
    .regex(semNumeroRegex, "O nome não pode conter números"),

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
    // O parse do Zod já vai formatar o req.body (aplicando trim e toLowerCase)
    req.body = usuarioSchema.parse(req.body);
    next();
    } catch (erro) {
    return res.status(400).json({
        status: 'erro',
        mensagens: erro.errors.map(e => e.message)
    });
    }
};

module.exports = validarUsuario;