const errorHandler = (err, req, res, next) => {
  console.error(`[Erro] ${err.stack || err.message}`);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(statusCode).json({
    status: 'erro',
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
