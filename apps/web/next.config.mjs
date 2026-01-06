import { withSentryConfig } from '@sentry/nextjs';
import crypto from 'crypto';

/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		serverActions: {
			// 支持生产环境域名（从环境变量读取）
			allowedOrigins: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL
				? [process.env.NEXT_PUBLIC_APP_URL.replace(/^https?:\/\//, '').split(':')[0], 'localhost', '127.0.0.1']
				: ['localhost', '127.0.0.1']
		},
		// instrumentationHook is automatically enabled in Next.js 15, no need to configure
	},
	// 启用压缩
	compress: true,
	// 优化图片
	images: {
		formats: ['image/avif', 'image/webp'],
		minimumCacheTTL: 60,
	},
	webpack: (config, { isServer }) => {
		// Suppress OpenTelemetry dynamic require warnings
		if (isServer) {
			config.ignoreWarnings = [
				{ module: /@opentelemetry\/instrumentation/ },
				{ module: /require-in-the-middle/ },
			];
		}
		// 优化 bundle 大小
		if (!isServer) {
			config.optimization = {
				...config.optimization,
				splitChunks: {
					chunks: 'all',
					cacheGroups: {
						default: false,
						vendors: false,
						// 将大型库单独打包
						framework: {
							name: 'framework',
							test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
							priority: 40,
							enforce: true,
						},
						lib: {
							test(module) {
								return module.size() > 160000 && /node_modules[/\\]/.test(module.identifier());
							},
							name(module) {
								const hash = crypto.createHash('sha1');
								hash.update(module.identifier());
								return hash.digest('hex').substring(0, 8);
							},
							priority: 30,
							minChunks: 1,
							reuseExistingChunk: true,
						},
						commons: {
							name: 'commons',
							minChunks: 2,
							priority: 20,
						},
						shared: {
							name(module, chunks) {
								return crypto
									.createHash('sha1')
									.update(chunks.reduce((acc, chunk) => acc + chunk.name, ''))
									.digest('hex')
									.substring(0, 8);
							},
							priority: 10,
							minChunks: 2,
							reuseExistingChunk: true,
						},
					},
				},
			};
		}
		return config;
	},
	redirects: async () => {
		return [];
	},
	headers: async () => {
		return [
			{
				source: '/(.*)',
				headers: [
					{ key: 'X-Frame-Options', value: 'DENY' },
					{ key: 'X-Content-Type-Options', value: 'nosniff' },
					{ key: 'Referrer-Policy', value: 'no-referrer' }
				]
			}
		];
	}
};

// Only enable Sentry if DSN is provided
const sentryOptions = {
	silent: !process.env.NEXT_PUBLIC_SENTRY_DSN,
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
};

export default process.env.NEXT_PUBLIC_SENTRY_DSN
	? withSentryConfig(nextConfig, sentryOptions)
	: nextConfig;


