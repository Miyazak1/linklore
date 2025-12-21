'use client';

import { useState, useCallback } from 'react';
import type { ShareCardConfig, ShareCardMessage } from '@/types/share';

const DEFAULT_CONFIG: ShareCardConfig = {
	title: '精彩对话',
	showLogo: true,
	showWatermark: true,
	backgroundColor: '#ffffff',
	textColor: '#1a1a1a',
	messageLimit: 15,
	maxMessageLength: 200,
	theme: 'default',
};

// 主题配色方案
export const THEME_CONFIGS: Record<string, Partial<ShareCardConfig>> = {
	default: {
		backgroundColor: '#ffffff',
		textColor: '#1a1a1a',
	},
	marxism: {
		// 马克思主义主题：温暖的红棕色系，专业且有深度
		backgroundColor: '#fef8f5', // 温暖的米白色背景
		textColor: '#2c1810', // 深棕色文字，更柔和
	},
	warm: {
		// 温暖主题：适合小红书风格
		backgroundColor: '#fffbf7', // 温暖的白色
		textColor: '#3d2817', // 温暖的棕色
	},
	minimal: {
		// 极简主题
		backgroundColor: '#ffffff',
		textColor: '#1a1a1a',
	},
};

export function useShareCard() {
	const [shareMode, setShareMode] = useState(false);
	const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
	const [cardConfig, setCardConfig] = useState<ShareCardConfig>(DEFAULT_CONFIG);
	const [selectedMessages, setSelectedMessages] = useState<ShareCardMessage[]>([]);

	const enterShareMode = useCallback(() => {
		setShareMode(true);
		setSelectedMessageIds(new Set());
		setSelectedMessages([]);
	}, []);

	const exitShareMode = useCallback(() => {
		setShareMode(false);
		setSelectedMessageIds(new Set());
		setSelectedMessages([]);
	}, []);

	const toggleMessage = useCallback((messageId: string, message: ShareCardMessage) => {
		setSelectedMessageIds((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(messageId)) {
				newSet.delete(messageId);
				// 同时更新 selectedMessages
				setSelectedMessages((prevMsgs) => prevMsgs.filter((m) => m.id !== messageId));
				return newSet;
			} else {
				// 检查是否超过限制
				if (newSet.size >= cardConfig.messageLimit) {
					return prev; // 不添加
				}
				newSet.add(messageId);
				// 同时更新 selectedMessages
				setSelectedMessages((prevMsgs) => {
					if (prevMsgs.some((m) => m.id === messageId)) {
						return prevMsgs;
					}
					return [...prevMsgs, message];
				});
				return newSet;
			}
		});
	}, [cardConfig.messageLimit]);

	const selectAll = useCallback((allMessages: ShareCardMessage[]) => {
		const limitedMessages = allMessages.slice(0, cardConfig.messageLimit);
		setSelectedMessageIds(new Set(limitedMessages.map((m) => m.id)));
		setSelectedMessages(limitedMessages);
	}, [cardConfig.messageLimit]);

	const clearSelection = useCallback(() => {
		setSelectedMessageIds(new Set());
		setSelectedMessages([]);
	}, []);

	const updateConfig = useCallback((updates: Partial<ShareCardConfig>) => {
		setCardConfig((prev) => ({ ...prev, ...updates }));
	}, []);

	return {
		shareMode,
		selectedMessageIds,
		selectedMessages,
		cardConfig,
		enterShareMode,
		exitShareMode,
		toggleMessage,
		selectAll,
		clearSelection,
		updateConfig,
	};
}

