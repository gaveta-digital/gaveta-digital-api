const { z } = require('zod');
const { nomeSchema } = require('./validarUsuario');

const perfilSchema = z.object({ nome: nomeSchema });

const validarAtualizacaoPerfil = (req, res, next) => {
    const corpo = req.body;

    if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo) || Object.keys(corpo).length === 0) {
        return res.status(400).json({ erro: 'Informe o campo nome' });
    }

    const camposExtras = Object.keys(corpo).filter((campo) => campo !== 'nome');
    if (camposExtras.length > 0) {
        return res.status(400).json({ erro: 'Somente o campo nome pode ser alterado' });
    }

    const resultado = perfilSchema.safeParse(corpo);
    if (!resultado.success) {
        return res.status(400).json({ erro: resultado.error.issues[0].message });
    }

    req.body = resultado.data;
    next();
};

module.exports = validarAtualizacaoPerfil;
