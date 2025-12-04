'use client';

import { getUserAvatarUrl } from '@/lib/utils/avatar';

interface AvatarProps {
	avatarUrl?: string | null;
	name?: string | null;
	email?: string;
	size?: number;
	className?: string;
	style?: React.CSSProperties;
	onClick?: () => void;
}

/**
 * 头像组件
 * 支持自定义头像和默认头像（从线上图库生成）
 */
export default function Avatar({
	avatarUrl,
	name,
	email,
	size = 40,
	className,
	style,
	onClick
}: AvatarProps) {
	const url = getUserAvatarUrl(avatarUrl, name, email, size);
	const defaultUrl = getUserAvatarUrl(null, name, email, size);
	
	// 调试日志（仅在开发环境）
	if (process.env.NODE_ENV === 'development' && avatarUrl) {
		console.log('[Avatar] Rendering with avatarUrl:', avatarUrl);
		console.log('[Avatar] Final URL:', url);
	}
	
	return (
		<img
			src={url}
			alt={name || email || '用户头像'}
			className={className}
			style={{
				width: size,
				height: size,
				borderRadius: '50%',
				objectFit: 'cover',
				cursor: onClick ? 'pointer' : 'default',
				...style
			}}
			onClick={onClick}
			onError={(e) => {
				// 如果图片加载失败，使用默认头像
				const target = e.target as HTMLImageElement;
				// 避免无限循环：如果已经是默认头像，就不再尝试
				if (target.src !== defaultUrl) {
					console.warn('[Avatar] Image load failed, using default avatar. Failed URL:', url);
					target.src = defaultUrl;
				}
			}}
			onLoad={() => {
				// 调试日志：图片加载成功
				if (process.env.NODE_ENV === 'development' && avatarUrl) {
					console.log('[Avatar] Image loaded successfully:', url);
				}
			}}
		/>
	);
}

