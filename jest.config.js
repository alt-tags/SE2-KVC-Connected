module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    // Match test files in /tests directory (including subdirectories)
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.test.jsx',
    
    // Additional pattern to match your server test files
    '<rootDir>/server/**/*.test.js' 
  ],
  moduleFileExtensions: ['js', 'json', 'jsx', 'node'],
  moduleDirectories: [
    'node_modules',
    '<rootDir>/server',       // For server modules
    '<rootDir>/client'        // If needing client modules
  ],
  moduleNameMapper: {
    // Map @/ to root directory for absolute imports
    '^@/(.*)$': '<rootDir>/$1',
    // Add specific mappings for server config
    '^@config/(.*)$': '<rootDir>/server/config/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/server/config/',
    '/server/utils/',
    '/tests/'
  ],
  collectCoverageFrom: [
    'server/**/*.{js,jsx}',
    '!**/node_modules/**',
    '!server/index.js'
  ],
  coverageReporters: ['text', 'lcov'],
  reporters: ['default', 'jest-junit']
};
