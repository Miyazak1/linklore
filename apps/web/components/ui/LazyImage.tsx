/**
 * 懒加载图片组件
 */
'use client';

import { useState } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
	src: string;
	alt: string;
	placeholder?: string;
}

export default function LazyImage({ src, alt, placeholder, ...props }: LazyImageProps) {
	const [imageRef, isIntersecting] = useIntersectionObserver<HTMLImageElement>({
		threshold: 0.1
	});
	const [loaded, setLoaded] = useState(false);
	const [error, setError] = useState(false);

	return (
		<div ref={imageRef} style={{ position: 'relative', ...props.style }}>
			{isIntersecting && (
				<img
					{...props}
					src={src}
					alt={alt}
					onLoad={() => setLoaded(true)}
					onError={() => setError(true)}
					style={{
						...props.style,
						opacity: loaded ? 1 : 0,
						transition: 'opacity 0.3s ease',
						display: error ? 'none' : 'block'
					}}
				/>
			)}
			{!loaded && !error && placeholder && (
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						background: 'var(--color-background-subtle)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: 'var(--color-text-tertiary)'
					}}
				>
					{placeholder}
				</div>
			)}
			{error && (
				<div
					style={{
						width: '100%',
						height: '100%',
						background: 'var(--color-background-subtle)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: 'var(--color-text-tertiary)'
					}}
				>
					图片加载失败
				</div>
			)}
		</div>
	);
}

