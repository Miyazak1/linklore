import { withSentryConfig } from '@sentry/nextjs';

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
	webpack: (config, { isServer }) => {
		// Suppress OpenTelemetry dynamic require warnings
		if (isServer) {
			config.ignoreWarnings = [
				{ module: /@opentelemetry\/instrumentation/ },
				{ module: /require-in-the-middle/ },
			];
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


