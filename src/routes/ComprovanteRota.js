const { Router } = require('express');
const ComprovanteController = require('../controllers/ComprovanteController');
const autenticacao = require('../middlewares/autenticacao');

const router = Router();

router.use('/comprovantes', autenticacao);

/**
 * @swagger
 * /comprovantes:
 *   post:
 *     summary: Cria novo comprovante
 *     tags:
 *       - Comprovantes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imagemUrl
 *               - categoriaId
 *             properties:
 *               estabelecimento:
 *                 type: string
 *                 nullable: true
 *                 example: Mercado Central
 *               data:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: "2026-09-15"
 *               valor:
 *                 type: number
 *                 nullable: true
 *                 example: 150.75
 *               categoriaId:
 *                 type: string
 *                 example: "categoria-uuid"
 *               imagemUrl:
 *                 type: string
 *                 example: "/interno/comprovante-123.jpg"
 *               observacoes:
 *                 type: string
 *                 nullable: true
 *                 example: Compra de material de escritório
 *     responses:
 *       201:
 *         description: Comprovante criado
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *   get:
 *     summary: Lista comprovantes do usuário (20 por página)
 *     tags:
 *       - Comprovantes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Lista de comprovantes
 *       401:
 *         description: Não autenticado
 */
router.post('/comprovantes', ComprovanteController.criar);
router.get('/comprovantes', ComprovanteController.listar);

/**
 * @swagger
 * /comprovantes/{id}:
 *   get:
 *     summary: Retorna detalhes de um comprovante
 *     tags:
 *       - Comprovantes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comprovante encontrado
 *       404:
 *         description: Comprovante não encontrado
 *       401:
 *         description: Não autenticado
 *   put:
 *     summary: Atualiza comprovante parcialmente
 *     tags:
 *       - Comprovantes
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
 *             properties:
 *               estabelecimento:
 *                 type: string
 *                 nullable: true
 *               data:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               valor:
 *                 type: number
 *                 nullable: true
 *               categoriaId:
 *                 type: string
 *               observacoes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Comprovante atualizado
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Comprovante não encontrado
 *       401:
 *         description: Não autenticado
 *   delete:
 *     summary: Deleta comprovante e sua imagem
 *     tags:
 *       - Comprovantes
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
 *         description: Comprovante deletado
 *       404:
 *         description: Comprovante não encontrado
 *       401:
 *         description: Não autenticado
 */
router.get('/comprovantes/:id', ComprovanteController.detalhar);
router.put('/comprovantes/:id', ComprovanteController.editar);
router.delete('/comprovantes/:id', ComprovanteController.excluir);

module.exports = router;
