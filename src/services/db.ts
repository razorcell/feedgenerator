// const logger = require('./logger.js');
// const Sequelize = require('sequelize');
// const Model = Sequelize.Model;

// const Paraguay_db = new Sequelize('paraguay', 'root', '0verlordX', {
//     host: '192.168.1.154',
//     dialect: 'mysql',
//     define: {
//         charset: 'ISO-8859-1',
//         collate: 'latin1_general_ci',
//         timestamps: true
//     }
// })

// class Bond extends Model { }
// Bond.init({
//     id: { primaryKey: true, type: Sequelize.INTEGER, autoIncrement: true },
//     localcode: { type: Sequelize.STRING, allowNull: false },
//     label: { type: Sequelize.STRING, allowNull: false },
// }, { Paraguay_db, modelName: 'bond' });


// class Document extends Model { }
// Document.init({
//     id: { primaryKey: true, type: Sequelize.INTEGER, autoIncrement: true },
//     label: { type: Sequelize.STRING, allowNull: false },
//     bond_id: {
//         type: Sequelize.INTEGER,
//         references: {
//             model: Bond,
//             key: 'id',
//         }
//     }
// }, { Paraguay_db, modelName: 'document' });


// module.exports = {
//     Paraguay_db,
// }
