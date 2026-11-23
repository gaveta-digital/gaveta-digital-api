const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Uma linha por tentativa de leitura na IA, inclusive as que falham (seção 9 das
// regras de negócio). Não aparece no app; é consultada por GET /api/uso-ia.
class UsoIA extends Model {
  static associate(models) {
    // apagar o usuário apaga o histórico de uso dele
    UsoIA.belongsTo(models.Usuario, {
      foreignKey: 'usuarioId',
      as: 'usuario',
      onDelete: 'CASCADE',
    });

    // apagar o comprovante não apaga o registro: o vínculo passa a null
    UsoIA.belongsTo(models.Comprovante, {
      foreignKey: 'comprovanteId',
      as: 'comprovante',
      onDelete: 'SET NULL',
    });
  }
}

// Uma definição nova por coluna: o Sequelize altera o objeto ao inicializar o
// model, então compartilhá-lo entre atributos faz as colunas colidirem.
const colunaDeTokens = () => ({
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 0,
  validate: { min: 0 },
});

UsoIA.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // comprovante criado na leitura; null quando nenhum foi criado
    comprovanteId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    modelo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tokensEntrada: colunaDeTokens(),
    tokensSaida: colunaDeTokens(),
    tokensTotal: colunaDeTokens(),
    duracaoMs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    resultado: {
      type: DataTypes.ENUM('sucesso', 'ilegivel', 'erro'),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'UsoIA',
    tableName: 'uso_ia',
  }
);

module.exports = UsoIA;
