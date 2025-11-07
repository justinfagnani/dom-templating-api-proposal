import type {TestRunnerConfig} from '@web/test-runner';
import {playwrightLauncher} from '@web/test-runner-playwright';

// https://modern-web.dev/docs/test-runner/cli-and-configuration/
const config: TestRunnerConfig = {
  // rootDir: '../../',
  // files: ['./test/**/*_test.js'],
  port: 8001,
  nodeResolve: {
    exportConditions: ['development', 'browser'],
  },
  browsers: [playwrightLauncher({product: 'chromium'})],
  testFramework: {
    // https://mochajs.org/api/mocha
    config: {
      ui: 'tdd',
    },
  },
};

export default config;
