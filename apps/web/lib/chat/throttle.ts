/**
 * AI 提示节流管理器
 * 防止 AI 提示过于频繁，提升用户体验
 */

interface ThrottleState {
	lastTriggerTime: number;
	triggerCount: number;
	resetTime: number; // 重置计数的时间
}

interface ThrottleConfig {
	maxTriggers: number; // 在时间窗口内的最大触发次数
	timeWindow: number; // 时间窗口（毫秒）
	minInterval: number; // 两次触发之间的最小间隔（毫秒）
}

class ThrottleManager {
	private states: Map<string, ThrottleState> = new Map();
	private config: ThrottleConfig;

	constructor(config: ThrottleConfig) {
		this.config = config;
	}

	/**
	 * 检查是否可以触发
	 * @param key 节流键（如 roomId + triggerType）
	 * @returns 是否可以触发
	 */
	canTrigger(key: string): boolean {
		const now = Date.now();
		const state = this.states.get(key);

		// 如果没有记录，可以触发
		if (!state) {
			this.states.set(key, {
				lastTriggerTime: now,
				triggerCount: 1,
				resetTime: now + this.config.timeWindow
			});
			return true;
		}

		// 如果已经超过时间窗口，重置计数
		if (now > state.resetTime) {
			this.states.set(key, {
				lastTriggerTime: now,
				triggerCount: 1,
				resetTime: now + this.config.timeWindow
			});
			return true;
		}

		// 检查最小间隔
		if (now - state.lastTriggerTime < this.config.minInterval) {
			return false;
		}

		// 检查触发次数
		if (state.triggerCount >= this.config.maxTriggers) {
			return false;
		}

		// 更新状态
		state.lastTriggerTime = now;
		state.triggerCount += 1;
		return true;
	}

	/**
	 * 记录一次触发（即使被节流）
	 */
	recordTrigger(key: string): void {
		const now = Date.now();
		const state = this.states.get(key);

		if (!state) {
			this.states.set(key, {
				lastTriggerTime: now,
				triggerCount: 1,
				resetTime: now + this.config.timeWindow
			});
		} else {
			state.lastTriggerTime = now;
			state.triggerCount += 1;
		}
	}

	/**
	 * 获取剩余可触发次数
	 */
	getRemainingTriggers(key: string): number {
		const state = this.states.get(key);
		if (!state) return this.config.maxTriggers;

		const now = Date.now();
		if (now > state.resetTime) return this.config.maxTriggers;

		return Math.max(0, this.config.maxTriggers - state.triggerCount);
	}

	/**
	 * 重置某个键的状态
	 */
	reset(key: string): void {
		this.states.delete(key);
	}

	/**
	 * 清理过期的状态
	 */
	cleanup(): void {
		const now = Date.now();
		for (const [key, state] of this.states.entries()) {
			if (now > state.resetTime + this.config.timeWindow * 2) {
				// 超过时间窗口的两倍，清理
				this.states.delete(key);
			}
		}
	}
}

// 默认配置
const defaultConfig: ThrottleConfig = {
	maxTriggers: 2, // 5分钟内最多触发2次
	timeWindow: 5 * 60 * 1000, // 5分钟
	minInterval: 30 * 1000 // 30秒最小间隔
};

// 创建全局节流管理器实例
export const autoPromptThrottle = new ThrottleManager(defaultConfig);

// 定期清理过期状态（每10分钟）
if (typeof setInterval !== 'undefined') {
	setInterval(() => {
		autoPromptThrottle.cleanup();
	}, 10 * 60 * 1000);
}

/**
 * 检查自动提示是否可以触发
 * @param roomId 房间ID
 * @param triggerType 触发类型（'tone' | 'structure' | 'consensus'）
 * @returns 是否可以触发
 */
export function canTriggerAutoPrompt(
	roomId: string,
	triggerType: 'tone' | 'structure' | 'consensus'
): boolean {
	const key = `${roomId}:${triggerType}`;
	return autoPromptThrottle.canTrigger(key);
}

/**
 * 记录自动提示触发
 */
export function recordAutoPrompt(roomId: string, triggerType: 'tone' | 'structure' | 'consensus'): void {
	const key = `${roomId}:${triggerType}`;
	autoPromptThrottle.recordTrigger(key);
}

/**
 * 获取用户可配置的节流设置
 */
export interface UserThrottleSettings {
	intensity: 'low' | 'medium' | 'high'; // 干预强度
	enableAutoPrompts: boolean; // 是否启用自动提示
}

/**
 * 根据用户设置调整节流配置
 */
export function getThrottleConfigForUser(settings: UserThrottleSettings): ThrottleConfig {
	const baseConfig = { ...defaultConfig };

	switch (settings.intensity) {
		case 'low':
			return {
				...baseConfig,
				maxTriggers: 1,
				timeWindow: 10 * 60 * 1000, // 10分钟
				minInterval: 60 * 1000 // 1分钟
			};
		case 'medium':
			return baseConfig;
		case 'high':
			return {
				...baseConfig,
				maxTriggers: 3,
				timeWindow: 3 * 60 * 1000, // 3分钟
				minInterval: 20 * 1000 // 20秒
			};
		default:
			return baseConfig;
	}
}









