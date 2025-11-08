const {describe, test} = require('node:test');
const assert = require('node:assert');
const {readFileSync, writeFileSync, readdirSync} = require('node:fs');
const {join, basename} = require('node:path');
const {transformSource} = require('../index');

const casesDir = join(__dirname, 'cases');

// Set UPDATE_SNAPSHOTS=1 to regenerate expected outputs
const UPDATE_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS === '1';

describe('transform test cases', () => {
  // Find all .input.ts files in the cases directory
  const inputFiles = readdirSync(casesDir).filter((f: string) =>
    f.endsWith('.input.ts') || f.endsWith('.input.tsx')
  );

  for (const inputFile of inputFiles) {
    const testName = basename(inputFile).replace(/\.input\.tsx?$/, '');
    const inputPath = join(casesDir, inputFile);
    const expectedPath = join(casesDir, `${testName}.expected.ts`);

    test(testName, () => {
      const input = readFileSync(inputPath, 'utf-8');
      let actual;
      if (testName.startsWith('component-') && testName !== 'component-default-behavior') {
        actual = transformSource(input, {
          componentFunctionName: 'component',
          componentModule: 'dom-templating-prototype/directives',
        });
      } else {
        actual = transformSource(input);
      }

      if (UPDATE_SNAPSHOTS) {
        writeFileSync(expectedPath, actual, 'utf-8');
        console.log(`Updated expected output for ${testName}`);
      } else {
        const expected = readFileSync(expectedPath, 'utf-8');
        assert.strictEqual(
          actual,
          expected,
          `Transform output doesn't match expected for ${testName}`
        );
      }
    });
  }
});
