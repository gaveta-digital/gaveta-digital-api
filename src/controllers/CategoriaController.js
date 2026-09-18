const CategoriaRepository = require('../repositories/CategoriaRepository');
const ComprovanteRepository = require('../repositories/ComprovanteRepository');

class CategoriaController {
  static async create(req, res, next) {
    try {
      const { nome } = req.body;
      const usuarioId = req.usuarioId;

      if (!nome) {
        return res.status(400).json({ erro: 'O nome da categoria é obrigatório' });
      }

      const categoria = await CategoriaRepository.create({ nome, usuarioId });
      return res.status(201).json(categoria);
    } catch (error) {
      next(error);
    }
  }

  static async list(req, res, next) {
    try {
      const usuarioId = req.usuarioId;
      const categorias = await CategoriaRepository.findAllByUsuario(usuarioId);
      return res.status(200).json(categorias);
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { nome } = req.body;
      const usuarioId = req.usuarioId;

      if (!nome) {
        return res.status(400).json({ erro: 'O nome da categoria é obrigatório para atualização' });
      }

      const categoria = await CategoriaRepository.findByIdAndUsuario(id, usuarioId);

      if (!categoria) {
        return res.status(404).json({ erro: 'Categoria não encontrada' });
      }

      if (categoria.nome === 'Outros' && nome !== 'Outros') {
        return res.status(400).json({ erro: 'A categoria "Outros" não pode ser renomeada' });
      }

      await categoria.update({ nome });
      return res.status(200).json(categoria);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuarioId;

      const categoria = await CategoriaRepository.findByIdAndUsuario(id, usuarioId);

      if (!categoria) {
        return res.status(404).json({ erro: 'Categoria não encontrada' });
      }

      if (categoria.nome === 'Outros') {
        return res.status(400).json({ erro: 'A categoria "Outros" não pode ser excluída' });
      }

      const comprovantesVinculados = await ComprovanteRepository.countByCategoria(id);

      if (comprovantesVinculados > 0) {
        return res.status(400).json({ erro: 'Não é possível excluir categoria com comprovantes vinculados' });
      }

      await categoria.destroy();
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CategoriaController;
