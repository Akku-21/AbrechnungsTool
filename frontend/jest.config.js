const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/app/layout.tsx',
  ],
  coverageThreshold: {
    // Global thresholds are disabled - we only test new modules for now
    // global: {
    //   branches: 70,
    //   functions: 70,
    //   lines: 70,
    //   statements: 70,
    // },
    // Per-file thresholds for our new modules
    './src/lib/utils.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/lib/constants.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/hooks/useDocumentPolling.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/hooks/useFileDragDrop.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
