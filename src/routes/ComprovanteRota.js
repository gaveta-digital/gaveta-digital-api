const { Router } = require('express');
const ComprovanteController = require('../controllers/ComprovanteController');
const autenticacao = require('../middlewares/autenticacao');

const router = Router();

router.use('/comprovantes', autenticacao);
router.post('/comprovantes', ComprovanteController.criar);
router.get('/comprovantes', ComprovanteController.listar);
router.get('/comprovantes/:id', ComprovanteController.detalhar);
router.put('/comprovantes/:id', ComprovanteController.editar);
router.delete('/comprovantes/:id', ComprovanteController.excluir);

module.exports = router;
