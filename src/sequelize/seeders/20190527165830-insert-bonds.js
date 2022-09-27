'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Bonds', [{
      localcode: 'AAA',
      label: 'Demo Bond',
    },
    {
      localcode: 'AAC',
      label: 'Demo Bond',
    },
    {
      localcode: 'AAB',
      label: 'Demo Bond',
    },
    {
      localcode: 'AAD',
      label: 'Demo Bond',
    },

    ], {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Bonds', null, {});
  }
};
