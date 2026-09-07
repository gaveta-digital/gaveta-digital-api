const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const dialect = process.env.DB_DIALECT || 'sqlite';
const storagePath = process.env.DB_STORAGE 
  ? path.resolve(process.env.DB_STORAGE) 
  : path.resolve(__dirname, '../../database.sqlite');

const sequelize = new Sequelize({
  dialect,
  storage: storagePath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

module.exports = sequelize;
