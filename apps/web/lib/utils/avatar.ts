/**
 * 生成用户头像URL
 * 如果用户有自定义头像，使用自定义头像
 * 否则使用基于用户信息的默认头像（从线上图库）
 */

/**
 * 生成默认头像URL（使用 UI Avatars 服务）
 * @param name 用户名称（可选）
 * @param email 用户邮箱
 * @param size 头像尺寸（默认 40）
 * @returns 头像URL
 */
export function getDefaultAvatarUrl(
	name?: string | null,
	email?: string,
	size: number = 40
): string {
	// 使用 UI Avatars 服务生成头像
	// 如果没有名称，使用邮箱的前两个字符
	const text = name 
		? name.charAt(0).toUpperCase()
		: email 
			? email.charAt(0).toUpperCase()
			: 'U';
	
	// 使用邮箱生成背景色（确保相同邮箱总是相同颜色）
	const bgColor = email 
		? generateColorFromString(email)
		: '6B7280'; // 默认灰色
	
	// UI Avatars API: https://ui-avatars.com/
	return `https://ui-avatars.com/api/?name=${encodeURIComponent(text)}&size=${size}&background=${bgColor}&color=fff&bold=true`;
}

/**
 * 从字符串生成颜色（用于头像背景）
 * @param str 输入字符串
 * @returns 十六进制颜色代码（不含 #）
 */
function generateColorFromString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	
	// 生成一个柔和的颜色（避免太亮或太暗）
	const hue = hash % 360;
	const saturation = 60 + (hash % 20); // 60-80%
	const lightness = 45 + (hash % 15); // 45-60%
	
	// 转换为十六进制
	const h = hue;
	const s = saturation;
	const l = lightness;
	
	// HSL to RGB to Hex
	const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
	const x = c * (1 - Math.abs((h / 60) % 2 - 1));
	const m = l / 100 - c / 2;
	
	let r = 0, g = 0, b = 0;
	
	if (h >= 0 && h < 60) {
		r = c; g = x; b = 0;
	} else if (h >= 60 && h < 120) {
		r = x; g = c; b = 0;
	} else if (h >= 120 && h < 180) {
		r = 0; g = c; b = x;
	} else if (h >= 180 && h < 240) {
		r = 0; g = x; b = c;
	} else if (h >= 240 && h < 300) {
		r = x; g = 0; b = c;
	} else {
		r = c; g = 0; b = x;
	}
	
	r = Math.round((r + m) * 255);
	g = Math.round((g + m) * 255);
	b = Math.round((b + m) * 255);
	
	return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/**
 * 获取用户头像URL
 * @param avatarUrl 用户自定义头像URL（可选）
 * @param name 用户名称（可选）
 * @param email 用户邮箱
 * @param size 头像尺寸（默认 40）
 * @returns 头像URL
 */
export function getUserAvatarUrl(
	avatarUrl?: string | null,
	name?: string | null,
	email?: string,
	size: number = 40
): string {
	if (avatarUrl) {
		return avatarUrl;
	}
	return getDefaultAvatarUrl(name, email, size);
}

