const path = require('node:path');
module.exports = (directory, integration = false) => ({
  displayName: path.basename(directory),
  rootDir: directory,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testTimeout: integration ? 60000 : 10000,
  maxWorkers: 1,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: path.resolve(__dirname, 'tsconfig.test.json') }],
  },
  moduleNameMapper: {
    '^@power-market-dashboard/database/testing$': path.resolve(
      __dirname,
      '../../libs/database/src/testing.ts',
    ),
    '^@power-market-dashboard/market$': path.resolve(__dirname, '../../libs/market/src/index.ts'),
    '^@power-market-dashboard/database$': path.resolve(
      __dirname,
      '../../libs/database/src/index.ts',
    ),
  },
});
