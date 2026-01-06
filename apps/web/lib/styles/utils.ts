/**
 * 样式工具函数
 * 用于生成常用的内联样式对象，减少重复代码
 * 
 * 使用方式：
 * import { styles } from '@/lib/styles/utils';
 * <div style={styles.formContainer}>...</div>
 */

import type { CSSProperties } from 'react';

/**
 * 常用样式对象集合
 */
export const styles = {
	// ========== 页面容器 ==========
	pageContainer: {
		padding: 'var(--spacing-xl)',
		maxWidth: 900,
		margin: '0 auto',
		background: 'var(--color-background)',
		minHeight: 'calc(100vh - 200px)',
		position: 'relative' as const,
	} as CSSProperties,

	pageContainerWithPanel: {
		padding: 'var(--spacing-xl)',
		maxWidth: 900,
		margin: '0 auto',
		background: 'var(--color-background)',
		minHeight: 'calc(100vh - 200px)',
		position: 'relative' as const,
		paddingRight: '360px',
	} as CSSProperties,

	// ========== 页面标题区域 ==========
	pageHeader: {
		marginBottom: 'var(--spacing-xxl)',
		textAlign: 'center' as const,
	} as CSSProperties,

	title: {
		margin: 0,
		fontSize: 'var(--font-size-2xl)',
		fontWeight: 700,
		color: 'var(--color-text-primary)',
	} as CSSProperties,

	subtitle: {
		margin: 'var(--spacing-sm) 0 0',
		fontSize: 'var(--font-size-sm)',
		color: 'var(--color-text-secondary)',
	} as CSSProperties,

	// ========== 返回按钮 ==========
	backButton: {
		position: 'absolute' as const,
		left: 'var(--spacing-xl)',
		padding: 'var(--spacing-sm)',
		border: '1px solid var(--color-border)',
		borderRadius: 'var(--radius-md)',
		background: 'var(--color-background-paper)',
		cursor: 'pointer' as const,
		display: 'flex' as const,
		alignItems: 'center' as const,
		justifyContent: 'center' as const,
		transition: 'all var(--transition-fast)',
	} as CSSProperties,

	// ========== 表单容器 ==========
	formContainer: {
		background: 'var(--color-background-paper)',
		borderRadius: 'var(--radius-lg)',
		padding: 'var(--spacing-xxl)',
		border: '1px solid var(--color-border-light)',
	} as CSSProperties,

	formFieldGroup: {
		display: 'flex' as const,
		flexDirection: 'column' as const,
		gap: 'var(--spacing-xl)',
	} as CSSProperties,

	// ========== 表单字段 ==========
	label: {
		display: 'block' as const,
		marginBottom: 'var(--spacing-xs)',
		fontSize: 'var(--font-size-sm)',
		color: 'var(--color-text-secondary)',
	} as CSSProperties,

	hint: {
		fontSize: 'var(--font-size-xs)',
		color: 'var(--color-text-tertiary)',
		margin: '0 0 var(--spacing-sm) 0',
		lineHeight: 'var(--line-height-relaxed)',
	} as CSSProperties,

	input: {
		width: '100%',
		padding: 'var(--spacing-md)',
		border: '1px solid var(--color-border)',
		borderRadius: 'var(--radius-md)',
		fontSize: 'var(--font-size-base)',
		background: 'var(--color-background)',
		color: 'var(--color-text-primary)',
		transition: 'all var(--transition-fast)',
	} as CSSProperties,

	textarea: {
		width: '100%',
		padding: 'var(--spacing-md)',
		border: '1px solid var(--color-border)',
		borderRadius: 'var(--radius-md)',
		fontSize: 'var(--font-size-base)',
		background: 'var(--color-background)',
		color: 'var(--color-text-primary)',
		fontFamily: 'inherit' as const,
		resize: 'vertical' as const,
		transition: 'all var(--transition-fast)',
	} as CSSProperties,

	// ========== 题目列表 ==========
	questionList: {
		display: 'flex' as const,
		flexDirection: 'column' as const,
		gap: 'var(--spacing-md)',
		marginBottom: 'var(--spacing-lg)',
	} as CSSProperties,

	questionItem: {
		display: 'flex' as const,
		alignItems: 'center' as const,
		gap: 'var(--spacing-sm)',
	} as CSSProperties,

	questionNumber: {
		minWidth: '24px',
		fontSize: 'var(--font-size-base)',
		color: 'var(--color-text-secondary)',
		fontWeight: 500,
	} as CSSProperties,

	questionInput: {
		flex: 1,
		padding: 'var(--spacing-sm) var(--spacing-md)',
		border: '1px solid var(--color-border)',
		borderRadius: 'var(--radius-md)',
		fontSize: 'var(--font-size-base)',
		background: 'var(--color-background)',
		color: 'var(--color-text-primary)',
		transition: 'all var(--transition-fast)',
	} as CSSProperties,

	hintInput: {
		width: '150px',
		padding: 'var(--spacing-sm) var(--spacing-md)',
		border: '1px solid var(--color-border)',
		borderRadius: 'var(--radius-md)',
		fontSize: 'var(--font-size-base)',
		background: 'var(--color-background)',
		color: 'var(--color-text-primary)',
		transition: 'all var(--transition-fast)',
	} as CSSProperties,

	// ========== 上传按钮 ==========
	uploadButton: {
		display: 'inline-flex' as const,
		alignItems: 'center' as const,
		gap: 'var(--spacing-xs)',
		padding: 'var(--spacing-sm) var(--spacing-md)',
		border: '1px solid var(--color-border)',
		borderRadius: 'var(--radius-md)',
		background: 'var(--color-background)',
		color: 'var(--color-text-primary)',
		fontSize: 'var(--font-size-sm)',
		cursor: 'pointer' as const,
		transition: 'all var(--transition-fast)',
	} as CSSProperties,

	fileInputLabel: {
		display: 'inline-block' as const,
		cursor: 'pointer' as const,
	} as CSSProperties,

	// ========== 图片预览 ==========
	imagePreview: {
		marginTop: 'var(--spacing-sm)',
		position: 'relative' as const,
		display: 'inline-block' as const,
	} as CSSProperties,

	imagePreviewImg: {
		maxWidth: '200px',
		maxHeight: '150px',
		borderRadius: 'var(--radius-md)',
		border: '1px solid var(--color-border-light)',
		objectFit: 'cover' as const,
	} as CSSProperties,

	imageDeleteButton: {
		position: 'absolute' as const,
		top: '-8px',
		right: '-8px',
		width: '24px',
		height: '24px',
		borderRadius: '50%',
		background: 'var(--color-error)',
		color: 'white',
		border: 'none',
		cursor: 'pointer' as const,
		display: 'flex' as const,
		alignItems: 'center' as const,
		justifyContent: 'center' as const,
		fontSize: 'var(--font-size-sm)',
		transition: 'all var(--transition-fast)',
	} as CSSProperties,

	// ========== 操作按钮组 ==========
	actionButtons: {
		display: 'flex' as const,
		gap: 'var(--spacing-sm)',
		flexWrap: 'wrap' as const,
	} as CSSProperties,

	submitButtons: {
		display: 'flex' as const,
		gap: 'var(--spacing-md)',
		marginTop: 'var(--spacing-xxl)',
		justifyContent: 'flex-end' as const,
	} as CSSProperties,

	// ========== 错误提示 ==========
	errorBox: {
		padding: 'var(--spacing-md)',
		marginTop: 'var(--spacing-lg)',
		background: 'var(--color-error-lighter, #ffebee)',
		color: 'var(--color-error)',
		borderRadius: 'var(--radius-md)',
		border: '1px solid var(--color-error)',
		fontSize: 'var(--font-size-sm)',
	} as CSSProperties,

	// ========== Flex 布局 ==========
	flexRow: {
		display: 'flex' as const,
		alignItems: 'center' as const,
		gap: 'var(--spacing-md)',
	} as CSSProperties,

	flexCol: {
		display: 'flex' as const,
		flexDirection: 'column' as const,
		gap: 'var(--spacing-md)',
	} as CSSProperties,

	// ========== 图标容器 ==========
	iconContainer: {
		width: '48px',
		height: '48px',
		borderRadius: 'var(--radius-md)',
		background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
		display: 'flex' as const,
		alignItems: 'center' as const,
		justifyContent: 'center' as const,
		flexShrink: 0,
	} as CSSProperties,
} as const;

/**
 * 组合多个样式对象
 * @param styleObjects - 要组合的样式对象数组
 * @returns 合并后的样式对象
 * 
 * @example
 * const combined = combineStyles(styles.input, { width: '50%' });
 */
export function combineStyles(
	...styleObjects: Array<CSSProperties | undefined | null | false>
): CSSProperties {
	return Object.assign({}, ...styleObjects.filter(Boolean)) as CSSProperties;
}

/**
 * 条件样式组合
 * @param condition - 条件
 * @param trueStyle - 条件为真时的样式
 * @param falseStyle - 条件为假时的样式（可选）
 * @returns 样式对象
 * 
 * @example
 * const style = conditionalStyle(isActive, styles.active, styles.inactive);
 */
export function conditionalStyle(
	condition: boolean,
	trueStyle: CSSProperties,
	falseStyle?: CSSProperties
): CSSProperties {
	return condition ? trueStyle : (falseStyle || {});
}


