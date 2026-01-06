/**
 * UploadButton - 上传按钮组件
 * 提供统一的上传按钮样式和功能
 */

import React from 'react';
import { UploadIcon } from '@/components/ui/Icons';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export interface UploadButtonProps {
	/** 上传状态 */
	uploading?: boolean;
	/** 文件变更回调 */
	onChange: (file: File) => void;
	/** 接受的文件类型 */
	accept?: string;
	/** 是否禁用 */
	disabled?: boolean;
	/** 按钮文字 */
	label?: string;
	/** 额外的类名 */
	className?: string;
	/** 文件大小限制（字节） */
	maxSize?: number;
	/** 文件大小限制错误回调 */
	onSizeError?: (maxSize: number) => void;
	/** 文件类型错误回调 */
	onTypeError?: () => void;
}

/**
 * 上传按钮组件
 * 
 * @example
 * <UploadButton
 *   uploading={uploading}
 *   onChange={(file) => handleUpload(file)}
 *   accept="image/*"
 *   label="点击上传封面"
 * />
 */
export function UploadButton({
	uploading = false,
	onChange,
	accept = 'image/*',
	disabled = false,
	label = '点击上传',
	className,
	maxSize,
	onSizeError,
	onTypeError
}: UploadButtonProps) {
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// 验证文件类型
		if (accept && !file.type.match(accept.replace('*', '.*'))) {
			onTypeError?.();
			return;
		}

		// 验证文件大小
		if (maxSize && file.size > maxSize) {
			onSizeError?.(maxSize);
			return;
		}

		onChange(file);
		// 重置 input，允许重复选择同一文件
		e.target.value = '';
	};

	return (
		<label className={`file-input-label ${className || ''}`}>
			<input
				type="file"
				accept={accept}
				onChange={handleFileChange}
				style={{ display: 'none' }}
				disabled={disabled || uploading}
			/>
			<div className="upload-button">
				{uploading ? (
					<LoadingSpinner size="sm" color="currentColor" />
				) : (
					<UploadIcon size={16} color="currentColor" />
				)}
				<span>{label}</span>
			</div>
		</label>
	);
}


