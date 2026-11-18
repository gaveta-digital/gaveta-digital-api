const errorHandler = (err, req, res, next) => {
  console.error(`[Erro] ${err.stack || err.message}`);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(statusCode).json({
    erro: message,
    ...(process.env.NODE_ENV === 'development' && { detalhe: err.stack }),
  });
};

module.exports = errorHandler;
