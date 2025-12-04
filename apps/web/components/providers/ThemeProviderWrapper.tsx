'use client';

import { ThemeProvider } from '@/lib/design/theme';
import { ChatStreamProvider } from '@/contexts/ChatStreamContext';

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider>
			<ChatStreamProvider>
				{children}
			</ChatStreamProvider>
		</ThemeProvider>
	);
}

