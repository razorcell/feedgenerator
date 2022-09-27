module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm',
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.(m)?js$': '$1',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(m)?ts$',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', 'src/**/*.mts', '!src/**/*.d.ts', '!src/**/*.d.mts'],
  // Uncomment for sending email after test
  // reporters: [
  //   'default',
  //   [
  //     'jest-email-reporter',
  //     {
  //       from: 'ediagadir.systems@exchange-data.com',
  //       to: 'k.rmili@exchange-data.com',
  //       subject: 'FeedGenerator Jest Tests', // optional
  //       reportIfSuccess: true, // optional, default is false; it send e-mail message if tests were successful
  //     },
  //   ],
  // ],
}
