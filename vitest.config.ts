import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['apps/web/__tests__/**/*.test.ts'],
		setupFiles: ['./apps/web/__tests__/setup.ts']
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'apps/web')
		}
	}
});

