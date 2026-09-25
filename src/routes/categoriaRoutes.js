const { Router } = require('express');
const CategoriaController = require('../controllers/CategoriaController');
const autenticacao = require('../middlewares/autenticacao');

const router = Router();

/**
 * @swagger
 * /categorias:
 *   post:
 *     summary: Cria nova categoria
 *     tags:
 *       - Categorias
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
 *                 example: Viagem
 *     responses:
 *       201:
 *         description: Categoria criada com sucesso
 *       400:
 *         description: Nome inválido
 *       409:
 *         description: Categoria duplicada para o usuário
 *       401:
 *         description: Não autenticado
 *   get:
 *     summary: Lista categorias do usuário autenticado
 *     tags:
 *       - Categorias
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorias
 *       401:
 *         description: Não autenticado
 */
router.post('/', autenticacao, CategoriaController.create);
router.get('/', autenticacao, CategoriaController.list);

/**
 * @swagger
 * /categorias/{id}:
 *   put:
 *     summary: Atualiza categoria (exceto "Outros")
 *     tags:
 *       - Categorias
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *                 example: Viagem Atualizada
 *     responses:
 *       200:
 *         description: Categoria atualizada
 *       400:
 *         description: Não pode renomear "Outros"
 *       404:
 *         description: Categoria não encontrada
 *       409:
 *         description: Nome duplicado
 *       401:
 *         description: Não autenticado
 *   delete:
 *     summary: Delete categoria (apenas sem comprovantes)
 *     tags:
 *       - Categorias
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Categoria deletada
 *       400:
 *         description: Categoria tem comprovantes ou é "Outros"
 *       404:
 *         description: Categoria não encontrada
 *       401:
 *         description: Não autenticado
 */
router.put('/:id', autenticacao, CategoriaController.update);
router.delete('/:id', autenticacao, CategoriaController.delete);

module.exports = router;
