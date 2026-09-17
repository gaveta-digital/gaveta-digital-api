const { Router } = require('express');
const categoriaRoutes = require('./categoriaRoutes');

const router = Router();

router.use('/categorias', categoriaRoutes);

//Apenas para testar se o servidor está funcionando
router.get('/teste', (req, res) => {
  res.status(200).json({
    status: 'API no ar',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.use('/', require('./UsuarioRota'));

module.exports = router;
