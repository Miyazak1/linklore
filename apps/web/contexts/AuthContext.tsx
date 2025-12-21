'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('AuthContext');

interface User {
	id: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
	role: string | null;
}

interface AuthState {
	isAuthenticated: boolean;
	user: User | null;
	loading: boolean;
}

interface AuthContextType extends AuthState {
	refreshAuth: (force?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [authState, setAuthState] = useState<AuthState>({
		isAuthenticated: false,
		user: null,
		loading: true
	});

	// 使用ref跟踪请求状态和防抖
	const isRequestingRef = useRef(false);
	const lastRequestTimeRef = useRef<number>(0);
	const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const CHECK_COOLDOWN = 2000; // 2秒冷却时间

	const refreshAuth = useCallback(async (force: boolean = false) => {
		const now = Date.now();
		
		// 如果强制刷新，跳过防抖
		if (!force) {
			// 防抖：如果距离上次请求不足冷却时间，延迟执行
			const timeSinceLastRequest = now - lastRequestTimeRef.current;
			
			if (timeSinceLastRequest < CHECK_COOLDOWN) {
				// 清除之前的定时器
				if (requestTimeoutRef.current) {
					clearTimeout(requestTimeoutRef.current);
				}
				// 延迟执行，确保距离上次请求至少间隔冷却时间
				requestTimeoutRef.current = setTimeout(() => {
					refreshAuth(false);
				}, CHECK_COOLDOWN - timeSinceLastRequest);
				return;
			}
		}

		// 如果正在请求，跳过
		if (isRequestingRef.current) {
			log.debug('Auth request already in progress, skipping');
			return;
		}

		// 更新最后请求时间
		lastRequestTimeRef.current = now;
		isRequestingRef.current = true;

		try {
			const res = await fetch('/api/auth/me');
			
			// 处理429错误（请求过于频繁）
			if (res.status === 429) {
				log.warn('Auth check rate limited (429), skipping');
				// 429错误时延长冷却时间
				lastRequestTimeRef.current = Date.now() + 5000; // 延长5秒
				return;
			}
			
			if (res.ok) {
				const data = await res.json();
				const user = data?.user || null;
				
				const newState = {
					isAuthenticated: !!user,
					user: user,
					loading: false
				};
				
				setAuthState(newState);
				
				// 保存到localStorage，供其他组件使用
				try {
					localStorage.setItem('auth_state', JSON.stringify({
						isAuthenticated: !!user,
						user: user
					}));
				} catch (err) {
					log.warn('Failed to save auth state to localStorage', err);
				}
				
				// 触发事件，通知其他组件（但不触发Navigation的refreshAuth，避免循环）
				// 注意：这里不触发auth:changed，因为Navigation已经会调用refreshAuth
				// 如果触发，会导致Navigation再次调用refreshAuth，形成循环
				// window.dispatchEvent(new Event('auth:changed'));
				
				log.debug('Auth state updated', { 
					isAuthenticated: !!user, 
					userId: user?.id 
				});
			} else {
				log.warn('Auth check returned non-200 status', { status: res.status });
				// 非200状态码时不更新状态，保持当前状态
			}
		} catch (err) {
			log.error('Auth check failed', err as Error);
			// 网络错误时不更新状态，保持当前状态
		} finally {
			isRequestingRef.current = false;
		}
	}, []);

	// 初始化时从localStorage读取
	useEffect(() => {
		try {
			const stored = localStorage.getItem('auth_state');
			if (stored) {
				const parsed = JSON.parse(stored);
				setAuthState({
					isAuthenticated: parsed.isAuthenticated || false,
					user: parsed.user || null,
					loading: false
				});
				log.debug('Auth state loaded from localStorage', {
					isAuthenticated: parsed.isAuthenticated || false
				});
			} else {
				setAuthState(prev => ({ ...prev, loading: false }));
			}
		} catch (err) {
			log.error('Failed to read auth state from localStorage', err as Error);
			setAuthState(prev => ({ ...prev, loading: false }));
		}

		// 不在这里监听auth:changed事件，避免与Navigation的监听冲突
		// Navigation已经会监听并调用refreshAuth，这里再监听会导致重复请求
	}, []);

	return (
		<AuthContext.Provider value={{ ...authState, refreshAuth }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within AuthProvider');
	}
	return context;
}

