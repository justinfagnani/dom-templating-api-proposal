import {describe, test} from 'node:test';
import assert from 'node:assert';
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {join, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {transformSource} from '../index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const casesDir = join(__dirname, 'cases');

// Set UPDATE_SNAPSHOTS=1 to regenerate expected outputs
const UPDATE_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS === '1';

describe('transform test cases', () => {
  // Find all .input.ts files in the cases directory
  const inputFiles = readdirSync(casesDir).filter((f) =>
    f.endsWith('.input.ts')
  );

  for (const inputFile of inputFiles) {
    const testName = basename(inputFile, '.input.ts');
    const inputPath = join(casesDir, inputFile);
    const expectedPath = join(casesDir, `${testName}.expected.ts`);

    test(testName, () => {
      const input = readFileSync(inputPath, 'utf-8');
      const actual = transformSource(input);

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
