const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(`[Erro] ${err.stack || err.message}`);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erro interno do servidor';

  // Tratamento de erros do Sequelize
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = err.errors[0].message;
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = err.errors[0].message || 'Registro já cadastrado';
  }

  const response = {
    erro: message,
  };

  if (process.env.NODE_ENV === 'development') {
    response.detalhe = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
