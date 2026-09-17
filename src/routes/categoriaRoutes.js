const { Router } = require('express');
const CategoriaController = require('../controllers/CategoriaController');
const autenticacao = require('../middlewares/autenticacao');

const router = Router();

router.post('/', autenticacao, CategoriaController.create);
router.get('/', autenticacao, CategoriaController.list);
router.put('/:id', autenticacao, CategoriaController.update);
router.delete('/:id', autenticacao, CategoriaController.delete);

module.exports = router;
