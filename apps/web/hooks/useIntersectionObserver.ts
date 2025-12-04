/**
 * Intersection Observer Hook
 * 用于实现懒加载
 */
'use client';

import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
	threshold?: number;
	root?: Element | null;
	rootMargin?: string;
	enabled?: boolean;
}

export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>(
	options: UseIntersectionObserverOptions = {}
): [React.RefObject<T>, boolean] {
	const { threshold = 0, root = null, rootMargin = '0px', enabled = true } = options;
	const [isIntersecting, setIsIntersecting] = useState(false);
	const elementRef = useRef<T>(null);

	useEffect(() => {
		if (!enabled || !elementRef.current) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsIntersecting(entry.isIntersecting);
			},
			{ threshold, root, rootMargin }
		);

		const currentElement = elementRef.current;
		observer.observe(currentElement);

		return () => {
			if (currentElement) {
				observer.unobserve(currentElement);
			}
		};
	}, [threshold, root, rootMargin, enabled]);

	return [elementRef, isIntersecting];
}

