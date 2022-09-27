'use strict';
module.exports = (sequelize, DataTypes) => {
  const Bond = sequelize.define('Bond', {
    localcode: { type: DataTypes.STRING, allowNull: false },
    label: { type: DataTypes.STRING, allowNull: false },
  }, {});
  Bond.associate = function (models) {
    Bond.hasMany(models.Document);
  };
  return Bond;
};