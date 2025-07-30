module.exports = {
    preset: '@metamask/snaps-jest',
    transform: {
      '^.+\\.(t|j)sx?$': 'ts-jest',
    },
    collectCoverageFrom: [
      'src/**/*.{ts,tsx}',
      '!src/**/*.test.{ts,tsx}',
      '!src/**/*.d.ts'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'json-summary'],
    testEnvironment: 'node',
    testMatch: [
      '**/src/**/*.test.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}'
    ],
    verbose: true
  };