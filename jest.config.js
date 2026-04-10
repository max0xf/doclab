module.exports = {
  roots: ['<rootDir>/src/frontend'],
  testMatch: ['<rootDir>/src/frontend/tests/unit/**/*.test.{ts,tsx}'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^services/(.*)$': '<rootDir>/src/frontend/services/$1',
    '^utils/(.*)$': '<rootDir>/src/frontend/utils/$1',
    '^hooks/(.*)$': '<rootDir>/src/frontend/hooks/$1',
    '^context/(.*)$': '<rootDir>/src/frontend/context/$1',
    '^components/(.*)$': '<rootDir>/src/frontend/components/$1',
    '^views/(.*)$': '<rootDir>/src/frontend/views/$1',
    '^types$': '<rootDir>/src/frontend/types.ts',
    '^types/(.*)$': '<rootDir>/src/frontend/types/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/src/frontend/tests/unit/__mocks__/fileMock.js',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/frontend/tests/unit/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/src/frontend/setupTests.ts'],
  testEnvironment: 'jest-environment-jsdom',
  testTimeout: 500,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/frontend/**/*.{ts,tsx}',
    '!src/frontend/tests/**',
    '!src/frontend/react-app-env.d.ts',
    '!src/frontend/setupTests.ts',
    '!src/frontend/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
};
