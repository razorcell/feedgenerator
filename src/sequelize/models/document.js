'use strict';
module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    label: { type: DataTypes.STRING, allowNull: false },
  }, {});
  Document.associate = function (models) {
    Document.belongsTo(models.Bond
    );
  };
  return Document;
};