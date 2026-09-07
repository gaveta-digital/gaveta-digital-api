const { Router } = require('express');

const router = Router();

//Apenas para testar se o servidor está funcionando
router.get('/teste', (req, res) => {
  res.status(200).json({
    status: 'API no ar',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
