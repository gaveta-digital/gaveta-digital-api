const {Router} = require('express');
const UsuarioController= require ('../controllers/UsuarioController')

const router = Router();

router.post('/usuarios', UsuarioController.criarUsuario);
router.post('/login', UsuarioController.loginUsuario);

module.exports = router;