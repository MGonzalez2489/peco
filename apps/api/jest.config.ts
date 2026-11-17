export default {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {tsconfig: '<rootDir>/tsconfig.spec.json'}],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    '^@peco/contracts$': '<rootDir>/../../libs/shared/contracts/src/index.ts',
    '^@peco/utils$': '<rootDir>/../../libs/shared/utils/src/index.ts',
  },
  coverageDirectory: '../../coverage/apps/api',
};
