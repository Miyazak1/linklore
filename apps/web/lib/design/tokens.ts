/**
 * Design tokens for LinkLore
 * Centralized design system values
 */

export const colors = {
	// Primary colors
	primary: {
		50: '#e3f2fd',
		100: '#bbdefb',
		200: '#90caf9',
		300: '#64b5f6',
		400: '#42a5f5',
		500: '#1976d2', // Main primary
		600: '#1565c0',
		700: '#0d47a1',
		800: '#0277bd',
		900: '#01579b',
	},
	// Secondary colors
	secondary: {
		50: '#f3e5f5',
		100: '#e1bee7',
		200: '#ce93d8',
		300: '#ba68c8',
		400: '#ab47bc',
		500: '#9c27b0', // Main secondary
		600: '#8e24aa',
		700: '#7b1fa2',
		800: '#6a1b9a',
		900: '#4a148c',
	},
	// Success colors
	success: {
		50: '#e8f5e9',
		100: '#c8e6c9',
		200: '#a5d6a7',
		300: '#81c784',
		400: '#66bb6a',
		500: '#4caf50', // Main success
		600: '#43a047',
		700: '#388e3c',
		800: '#2e7d32',
		900: '#1b5e20',
	},
	// Warning colors
	warning: {
		50: '#fff3e0',
		100: '#ffe0b2',
		200: '#ffcc80',
		300: '#ffb74d',
		400: '#ffa726',
		500: '#ff9800', // Main warning
		600: '#fb8c00',
		700: '#f57c00',
		800: '#ef6c00',
		900: '#e65100',
	},
	// Error colors
	error: {
		50: '#ffebee',
		100: '#ffcdd2',
		200: '#ef9a9a',
		300: '#e57373',
		400: '#ef5350',
		500: '#f44336', // Main error
		600: '#e53935',
		700: '#d32f2f',
		800: '#c62828',
		900: '#b71c1c',
	},
	// Neutral colors
	gray: {
		50: '#fafafa',
		100: '#f5f5f5',
		200: '#eeeeee',
		300: '#e0e0e0',
		400: '#bdbdbd',
		500: '#9e9e9e',
		600: '#757575',
		700: '#616161',
		800: '#424242',
		900: '#212121',
	},
	// Background colors
	background: {
		default: '#ffffff',
		paper: '#f9f9f9',
		elevated: '#ffffff',
	},
	// Text colors
	text: {
		primary: '#212121',
		secondary: '#757575',
		disabled: '#bdbdbd',
		hint: '#9e9e9e',
	},
};

export const spacing = {
	xs: '4px',
	sm: '8px',
	md: '16px',
	lg: '24px',
	xl: '32px',
	xxl: '48px',
};

export const typography = {
	fontFamily: {
		sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
		mono: '"Courier New", Courier, monospace',
	},
	fontSize: {
		xs: '0.75rem',   // 12px
		sm: '0.875rem',  // 14px
		base: '1rem',    // 16px
		lg: '1.125rem',  // 18px
		xl: '1.25rem',   // 20px
		'2xl': '1.5rem', // 24px
		'3xl': '1.875rem', // 30px
		'4xl': '2.25rem',  // 36px
	},
	fontWeight: {
		light: 300,
		normal: 400,
		medium: 500,
		semibold: 600,
		bold: 700,
	},
	lineHeight: {
		tight: 1.25,
		snug: 1.375,
		normal: 1.5,
		relaxed: 1.625,
		loose: 2,
	},
};

export const borderRadius = {
	none: '0',
	sm: '4px',
	md: '8px',
	lg: '12px',
	xl: '16px',
	full: '9999px',
};

export const shadows = {
	sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
	md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
	lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
	xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

export const transitions = {
	duration: {
		fast: '150ms',
		normal: '250ms',
		slow: '350ms',
	},
	easing: {
		easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
		easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
		easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
	},
};

export const breakpoints = {
	sm: '640px',
	md: '768px',
	lg: '1024px',
	xl: '1280px',
	'2xl': '1536px',
};










