/**
 * Simple i18n utility (lightweight alternative to next-intl)
 * For now, we'll use a simple client-side solution
 */

'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { type Locale, defaultLocale, locales } from '@/i18n/config';
import zhCN from '@/i18n/messages/zh-CN';
import enUS from '@/i18n/messages/en-US';

// Messages are imported directly - Next.js will handle tree-shaking on server
const messages: Record<Locale, any> = {
	'zh-CN': zhCN,
	'en-US': enUS,
};

interface I18nContextType {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>(defaultLocale);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		try {
			const saved = localStorage.getItem('locale') as Locale | null;
			if (saved && locales.includes(saved)) {
				setLocaleState(saved);
			}
		} catch (e) {
			// localStorage might not be available
			console.warn('Failed to read locale from localStorage:', e);
		}
	}, []);

	const setLocale = (newLocale: Locale) => {
		setLocaleState(newLocale);
		try {
			localStorage.setItem('locale', newLocale);
		} catch (e) {
			console.warn('Failed to save locale to localStorage:', e);
		}
	};

	const t = (key: string): string => {
		if (typeof window === 'undefined') {
			return key; // Return key during SSR
		}
		try {
			const keys = key.split('.');
			let value: any = messages[locale];
			for (const k of keys) {
				value = value?.[k];
			}
			return value || key;
		} catch (e) {
			console.warn('Translation error for key:', key, e);
			return key;
		}
	};

	const contextValue: I18nContextType = mounted
		? { locale, setLocale, t }
		: { 
			locale: defaultLocale, 
			setLocale: () => {}, 
			t: (key: string) => key 
		};

	// Always render children, even if there's an error
	return (
		<I18nContext.Provider value={contextValue}>
			{children}
		</I18nContext.Provider>
	);
}

export function useI18n() {
	const context = useContext(I18nContext);
	if (context === undefined) {
		throw new Error('useI18n must be used within an I18nProvider');
	}
	return context;
}

