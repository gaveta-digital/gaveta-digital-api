const { Router } = require('express');
const CategoriaController = require('../controllers/CategoriaController');

const router = Router();

router.post('/', CategoriaController.create);
router.get('/', CategoriaController.list);
router.put('/:id', CategoriaController.update);
router.delete('/:id', CategoriaController.delete);

module.exports = router;
