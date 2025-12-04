import ProvidersWrapper from '@/components/providers/ThemeProviderWrapper';
import './globals.css';

export const metadata = {
	title: process.env.NEXT_PUBLIC_SITE_NAME || 'LinkLore',
	description: 'Document-centric academic discussion platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="zh-CN" suppressHydrationWarning>
			<body>
				<ProvidersWrapper>
					{children}
				</ProvidersWrapper>
			</body>
		</html>
	);
}


