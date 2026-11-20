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
 *         name: pagina
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limite
 *         description: Registros por página (máximo 100)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: categoriaId
 *         description: Restringe a lista a uma categoria do próprio usuário
 *         schema:
 *           type: string
 *       - in: query
 *         name: busca
 *         description: >
 *           Procura o texto em estabelecimento ou observações, sem
 *           diferenciar maiúsculas e minúsculas (máximo 100 caracteres)
 *         schema:
 *           type: string
 *           maxLength: 100
 *     responses:
 *       200:
 *         description: Lista de comprovantes
 *       400:
 *         description: categoriaId inválido/de outro usuário, ou busca acima de 100 caracteres
 *       401:
 *         description: Não autenticado
 */
router.post('/comprovantes', uploadImagem, ComprovanteController.criar);
router.get('/comprovantes', ComprovanteController.listar);

/**
 * @swagger
 * /comprovantes/resumo:
 *   get:
 *     summary: Resumo do mês dos comprovantes do usuário
 *     description: >
 *       Soma os valores e conta os comprovantes do usuário autenticado no
 *       mês informado, agrupando também por categoria. O mês do comprovante
 *       é o de sua data; sem data, usa a data de cadastro, no fuso
 *       America/Fortaleza.
 *     tags:
 *       - Comprovantes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mes
 *         description: Mês no formato YYYY-MM. Sem este parâmetro, usa o mês atual.
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}$'
 *     responses:
 *       200:
 *         description: Resumo do mês
 *       400:
 *         description: Formato de mês inválido ou mês futuro
 *       401:
 *         description: Não autenticado
 */
router.get('/comprovantes/resumo', ComprovanteController.resumo);

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
 *   patch:
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
 *                 maxLength: 500
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
router.patch('/comprovantes/:id', ComprovanteController.editar);
router.delete('/comprovantes/:id', ComprovanteController.excluir);

/**
 * @swagger
 * /comprovantes/{id}/imagem:
 *   get:
 *     summary: Retorna o arquivo de imagem do comprovante
 *     description: >
 *       Rota protegida — exige autenticação e verifica que o comprovante
 *       pertence ao usuário autenticado antes de retornar o arquivo.
 *       Não expõe caminhos internos do armazenamento.
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
 *         description: Arquivo de imagem (JPEG, PNG ou WebP)
 *         content:
 *           image/jpeg: {}
 *           image/png: {}
 *           image/webp: {}
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Comprovante pertence a outro usuário
 *       404:
 *         description: Comprovante ou imagem não encontrados
 */
router.get('/comprovantes/:id/imagem', ComprovanteController.imagem);

module.exports = router;
