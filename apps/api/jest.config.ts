export default {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {tsconfig: '<rootDir>/tsconfig.spec.json'}],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    // E2E boots the real AppModule; the ESM-only package is replaced by a
    // CommonJS stub that reuses the suite's migrated DataSource.
    '^@nestjs/typeorm$': '<rootDir>/src/app/testing/typeorm-module.stub.ts',
    '^@peco/contracts$': '<rootDir>/../../libs/shared/contracts/src/index.ts',
    '^@peco/enums$': '<rootDir>/../../libs/shared/enums/src/index.ts',
    '^@peco/utils$': '<rootDir>/../../libs/shared/utils/src/index.ts',
  },
  coverageDirectory: '../../coverage/apps/api',
};
