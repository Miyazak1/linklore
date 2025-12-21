'use client';

import { ThemeProvider } from '@/lib/design/theme';
import { ChatStreamProvider } from '@/contexts/ChatStreamContext';
import { AuthProvider } from '@/contexts/AuthContext';

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider>
			<AuthProvider>
				<ChatStreamProvider>
					{children}
				</ChatStreamProvider>
			</AuthProvider>
		</ThemeProvider>
	);
}

