module.exports = {
  rootDir: __dirname,
  verbose: false,
  testEnvironment: 'jsdom',
  cacheDirectory: '<rootDir>/jest_cache',
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  moduleNameMapper: {
    '@/(.*)$': '<rootDir>/src/$1',
  },
  restoreMocks: true,
  testMatch: ['<rootDir>/src/**/?(*.)spec.{js,ts,tsx}'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules',
    '/node_modules/',
    '/dist/',
  ],
  slowTestThreshold: 100,
  setupFiles: ['<rootDir>/beforeTest.js'],
  transformIgnorePatterns: [
    // '/node_modules/(?!crypto-hash|yet-another-react-lightbox|@axon/schemautils|@axon/pdf-generator)',
  ],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
};
