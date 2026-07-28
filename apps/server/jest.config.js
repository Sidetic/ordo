/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  moduleFileExtensions: ["js", "json", "ts"],
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { isolatedModules: true }],
  },
  moduleNameMapper: {
    "^@ordo/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^@ordo/shared/(.*)$": "<rootDir>/../../packages/shared/src/$1.ts",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/main.ts", "!src/**/*/module.ts"],
  coverageDirectory: "./coverage",
  testTimeout: 20000,
};
