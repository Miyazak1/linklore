'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
	({ label, error, fullWidth = false, style, ...props }, ref) => {
		return (
			<div style={{ width: fullWidth ? '100%' : 'auto', marginBottom: label || error ? '12px' : 0 }}>
				{label && (
					<label
						style={{
							display: 'block',
							marginBottom: '4px',
							fontSize: '0.875rem',
							fontWeight: 500,
							color: 'var(--color-text-primary)',
						}}
					>
						{label}
					</label>
				)}
				<input
					ref={ref}
					{...props}
					style={{
						width: '100%',
						padding: '8px 12px',
						border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
						borderRadius: 'var(--radius-md)',
						fontSize: '1rem',
						background: 'var(--color-background)',
						color: 'var(--color-text-primary)',
						transition: 'all var(--transition-fast)',
						...style,
					}}
					onFocus={(e) => {
						e.currentTarget.style.borderColor = 'var(--color-primary)';
						e.currentTarget.style.outline = 'none';
						e.currentTarget.style.boxShadow = '0 0 0 2px rgba(25, 118, 210, 0.2)';
					}}
					onBlur={(e) => {
						e.currentTarget.style.borderColor = error ? 'var(--color-error)' : 'var(--color-border)';
						e.currentTarget.style.boxShadow = '';
					}}
				/>
				{error && (
					<div
						style={{
							marginTop: '4px',
							fontSize: '0.875rem',
							color: 'var(--color-error)',
						}}
					>
						{error}
					</div>
				)}
			</div>
		);
	}
);

Input.displayName = 'Input';

export default Input;










