const {Router} = require('express');
const UsuarioController= require ('../controllers/UsuarioController')
const validarUsuario = require('../middlewares/validarUsuario');
const validarLogin = require('../middlewares/validarLogin');

const router = Router();

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Cadastra novo usuário
 *     tags:
 *       - Usuários
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - senha
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 example: joao@example.com
 *               senha:
 *                 type: string
 *                 example: Senha123
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso (6 categorias iniciais criadas automaticamente)
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Email já cadastrado
 */
router.post('/usuarios', validarUsuario, UsuarioController.criarUsuario);

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Autentica usuário e retorna token JWT
 *     tags:
 *       - Usuários
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 example: joao@example.com
 *               senha:
 *                 type: string
 *                 example: Senha123
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *       401:
 *         description: Email ou senha incorreta
 */
router.post('/login', validarLogin, UsuarioController.loginUsuario);

module.exports = router;