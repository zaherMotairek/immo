/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  testTimeout: 60000,
  // Les specs d’intégration lisent DATABASE_URL_TEST (voir test/helpers/test-env.ts).
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
};
