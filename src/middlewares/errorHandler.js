const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(`[Erro] ${err.stack || err.message}`);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  const response = {
    erro: message,
  };

  if (process.env.NODE_ENV === 'development') {
    response.detalhe = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
