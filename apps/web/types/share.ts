/**
 * 分享卡片相关类型定义
 */

export interface ShareCardConfig {
	title?: string;
	showLogo: boolean;
	showWatermark: boolean;
	backgroundColor: string;
	textColor: string;
	messageLimit: number; // 最多显示的消息数
	maxMessageLength: number; // 单条消息最大长度
	theme?: 'default' | 'marxism' | 'warm' | 'minimal'; // 主题选项
}

export interface ShareCardMessage {
	id: string;
	content: string;
	senderName: string;
	senderAvatar?: string;
	isCurrentUser: boolean;
	createdAt: string;
	type: 'USER' | 'AI_SUGGESTION' | 'AI_ADOPTED';
}

export enum ShareError {
	NO_MESSAGES_SELECTED = '请至少选择一条消息',
	GENERATION_FAILED = '图片生成失败，请重试',
	TOO_MANY_MESSAGES = '消息数量过多，请选择 15 条以内',
	NETWORK_ERROR = '网络错误，请检查连接',
	INVALID_MESSAGE = '消息格式无效',
}

