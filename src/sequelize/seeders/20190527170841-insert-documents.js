'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Documents', [{
      bondId: 0,
      label: 'Demo Document',
    },
    {
      bondId: 1,
      label: 'Demo Document',
    },
    {
      bondId: 2,
      label: 'Demo Document',
    },
    {
      bondId: 3,
      label: 'Demo Document',
    },
    ], {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Documents', null, {});
  }
};
