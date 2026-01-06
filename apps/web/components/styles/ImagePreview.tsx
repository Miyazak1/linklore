/**
 * ImagePreview - 图片预览组件
 * 用于显示上传的图片并提供删除功能
 */

import React from 'react';

export interface ImagePreviewProps {
	/** 图片 URL */
	src: string;
	/** 图片描述 */
	alt?: string;
	/** 删除回调 */
	onDelete?: () => void;
	/** 最大宽度（像素） */
	maxWidth?: number;
	/** 最大高度（像素） */
	maxHeight?: number;
	/** 额外的类名 */
	className?: string;
}

/**
 * 图片预览组件
 * 
 * @example
 * <ImagePreview
 *   src={imageUrl}
 *   alt="封面预览"
 *   onDelete={() => setImageUrl(null)}
 * />
 */
export function ImagePreview({
	src,
	alt = '预览',
	onDelete,
	maxWidth = 200,
	maxHeight = 150,
	className
}: ImagePreviewProps) {
	return (
		<div className={`image-preview ${className || ''}`}>
			<img
				src={src}
				alt={alt}
				style={{
					maxWidth: `${maxWidth}px`,
					maxHeight: `${maxHeight}px`,
					borderRadius: 'var(--radius-md)',
					border: '1px solid var(--color-border-light)',
					objectFit: 'cover'
				}}
			/>
			{onDelete && (
				<button
					type="button"
					onClick={onDelete}
					className="image-delete-button"
					title="删除图片"
				>
					×
				</button>
			)}
		</div>
	);
}


