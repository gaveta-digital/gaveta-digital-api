const { Categoria, Comprovante } = require('../models');

class CategoriaController {
  static async create(req, res, next) {
    try {
      const { nome } = req.body;
      const categoria = await Categoria.create({ nome });
      return res.status(201).json(categoria);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'erro',
          message: 'Categoria já cadastrada',
        });
      }
      next(error);
    }
  }

  static async list(req, res, next) {
    try {
      const categorias = await Categoria.findAll();
      return res.status(200).json(categorias);
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { nome } = req.body;

      const categoria = await Categoria.findByPk(id);
      if (!categoria) {
        return res.status(404).json({
          status: 'erro',
          message: 'Categoria não encontrada',
        });
      }

      await categoria.update({ nome });
      return res.status(200).json(categoria);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'erro',
          message: 'Categoria já cadastrada',
        });
      }
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const categoria = await Categoria.findByPk(id);
      if (!categoria) {
        return res.status(404).json({
          status: 'erro',
          message: 'Categoria não encontrada',
        });
      }

      const comprovantesVinculados = await Comprovante.count({
        where: { categoriaId: id },
      });

      if (comprovantesVinculados > 0) {
        return res.status(400).json({
          status: 'erro',
          message: 'Não é possível excluir categoria com comprovantes vinculados',
        });
      }

      await categoria.destroy();
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CategoriaController;
