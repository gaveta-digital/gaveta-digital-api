const {Router} = require('express');
const UsuarioController= require ('../controllers/UsuarioController')
const validarUsuario = require('../middlewares/validarUsuario');
const validarLogin = require('../middlewares/validarLogin');

const router = Router();

router.post('/usuarios', validarUsuario, UsuarioController.criarUsuario);
router.post('/login', validarLogin, UsuarioController.loginUsuario);

module.exports = router;