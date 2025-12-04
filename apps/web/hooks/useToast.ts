'use client';

import { useState, useCallback } from 'react';
import Toast from '@/components/ui/Toast';

interface ToastState {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info' | 'warning';
}

export function useToast() {
	const [toasts, setToasts] = useState<ToastState[]>([]);

	const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
		const id = Math.random().toString(36).substring(7);
		setToasts((prev) => [...prev, { id, message, type }]);
		return id;
	}, []);

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	}, []);

	const ToastContainer = () => (
		<>
			{toasts.map((toast) => (
				<Toast
					key={toast.id}
					message={toast.message}
					type={toast.type}
					onClose={() => removeToast(toast.id)}
				/>
			))}
		</>
	);

	return { showToast, ToastContainer };
}










