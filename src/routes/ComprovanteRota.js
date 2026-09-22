const { Router } = require('express');
const ComprovanteController = require('../controllers/ComprovanteController');
const autenticacao = require('../middlewares/autenticacao');
const uploadImagem = require('../middlewares/uploadImagem');

const router = Router();

router.use('/comprovantes', autenticacao);

/**
 * @swagger
 * /comprovantes:
 *   post:
 *     summary: Cria comprovante a partir de uma imagem (analisada pela IA/Gemini)
 *     description: >
 *       O cliente envia a foto do comprovante. A API busca as categorias do
 *       usuário autenticado, envia a imagem ao Gemini junto com essa lista e
 *       extrai estabelecimento, data, valor e categoria automaticamente.
 *       Campos não identificados ficam null; categoria não identificada usa
 *       "Outros" do usuário.
 *     tags:
 *       - Comprovantes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - imagem
 *             properties:
 *               imagem:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo JPEG, PNG ou WebP de até 10 MiB
 *     responses:
 *       201:
 *         description: Comprovante criado a partir da análise da imagem
 *       400:
 *         description: Nenhuma imagem enviada
 *       401:
 *         description: Não autenticado
 *       413:
 *         description: Imagem acima de 10 MiB
 *       415:
 *         description: Formato de imagem não suportado
 *       422:
 *         description: Imagem ilegível — não foi possível interpretar o comprovante
 *       503:
 *         description: Serviço de leitura (Gemini) indisponível no momento
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
router.post('/comprovantes', uploadImagem, ComprovanteController.criar);
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
