const {Router} = require('express');
const UsuarioController= require ('../controllers/UsuarioController')
const validarUsuario = require('../middlewares/validarUsuario');
const validarLogin = require('../middlewares/validarLogin');
const autenticacao = require('../middlewares/autenticacao');
const validarAtualizacaoPerfil = require('../middlewares/validarAtualizacaoPerfil');

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

/**
 * @swagger
 * /usuarios/me:
 *   get:
 *     summary: Retorna o perfil do usuário autenticado
 *     tags:
 *       - Usuários
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil do usuário (id, nome e email)
 *       401:
 *         description: Token ausente, inválido ou expirado
 *   patch:
 *     summary: Atualiza o nome do usuário autenticado
 *     tags:
 *       - Usuários
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João Silva
 *     responses:
 *       200:
 *         description: Perfil atualizado (id, nome e email)
 *       400:
 *         description: Nome inválido, campo não permitido ou corpo vazio
 *       401:
 *         description: Token ausente, inválido ou expirado
 */
router.get('/usuarios/me', autenticacao, UsuarioController.obterPerfil);
router.patch('/usuarios/me', autenticacao, validarAtualizacaoPerfil, UsuarioController.atualizarPerfil);

module.exports = router;
