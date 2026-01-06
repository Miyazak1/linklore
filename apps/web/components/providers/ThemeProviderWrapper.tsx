'use client';

import { ThemeProvider } from '@/lib/design/theme';
import { AuthProvider } from '@/contexts/AuthContext';

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider>
			<AuthProvider>
				{children}
			</AuthProvider>
		</ThemeProvider>
	);
}

