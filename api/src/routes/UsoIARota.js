const { Router } = require('express');
const UsoIAController = require('../controllers/UsoIAController');
const autenticacao = require('../middlewares/autenticacao');

const router = Router();

/**
 * @swagger
 * /uso-ia:
 *   get:
 *     summary: Consumo de tokens da IA pelo usuário autenticado
 *     description: >
 *       Resume as tentativas de leitura de comprovantes na IA (Groq) feitas pelo
 *       usuário do token: total de tentativas, tokens de entrada, saída e total,
 *       a soma por modelo e as 10 últimas tentativas. Cada tentativa gera um
 *       registro, inclusive as que falham (timeout, 503, imagem ilegível). Só traz
 *       os dados do próprio usuário. Não aparece no aplicativo.
 *     tags:
 *       - Uso da IA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumo do uso da IA
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalTentativas:
 *                       type: integer
 *                       example: 3
 *                     tokensEntrada:
 *                       type: integer
 *                       example: 4000
 *                     tokensSaida:
 *                       type: integer
 *                       example: 130
 *                     tokensTotal:
 *                       type: integer
 *                       example: 4130
 *                     porModelo:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           modelo:
 *                             type: string
 *                             example: qwen/qwen3.8-27b
 *                           tentativas:
 *                             type: integer
 *                           tokensEntrada:
 *                             type: integer
 *                           tokensSaida:
 *                             type: integer
 *                           tokensTotal:
 *                             type: integer
 *                     ultimas:
 *                       type: array
 *                       description: As 10 tentativas mais recentes
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           modelo:
 *                             type: string
 *                           resultado:
 *                             type: string
 *                             enum: [sucesso, ilegivel, erro]
 *                           tokensEntrada:
 *                             type: integer
 *                           tokensSaida:
 *                             type: integer
 *                           tokensTotal:
 *                             type: integer
 *                           duracaoMs:
 *                             type: integer
 *                           comprovanteId:
 *                             type: string
 *                             nullable: true
 *                           criadoEm:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Não autenticado
 */
router.get('/uso-ia', autenticacao, UsoIAController.resumo);

module.exports = router;
