'use client';

import { useI18n } from '@/lib/i18n';
import { locales, localeNames, type Locale } from '@/i18n/config';

export default function LanguageToggle() {
	const { locale, setLocale } = useI18n();

	return (
		<select
			value={locale}
			onChange={(e) => setLocale(e.target.value as Locale)}
			style={{
				padding: '6px 12px',
				background: 'var(--color-background-paper)',
				border: '1px solid var(--color-border)',
				borderRadius: 'var(--radius-md)',
				cursor: 'pointer',
				fontSize: '0.9em',
				color: 'var(--color-text-primary)',
			}}
			aria-label="切换语言"
		>
			{locales.map((loc) => (
				<option key={loc} value={loc}>
					{localeNames[loc]}
				</option>
			))}
		</select>
	);
}










