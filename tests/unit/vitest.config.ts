import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { decorator: { legacy: true } },
  test: { include: ['tests/unit/**/*.test.ts'] },
});
