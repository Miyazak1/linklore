/**
 * 全局保守模式开关
 * 紧急情况下的安全开关，可以暂时关闭某些高敏功能
 */

interface ConservativeModeConfig {
	enabled: boolean;
	disableAutoPrompts: boolean; // 禁用自动提示
	disableHighRiskPlugins: boolean; // 禁用高风险插件
	maxRiskLevel: 0 | 1 | 2 | 3 | 4; // 最大允许的风险等级
	disabledPlugins: string[]; // 禁用的插件列表
	disabledTasks: string[]; // 禁用的任务列表
}

// 从环境变量读取保守模式配置
const getConservativeModeFromEnv = (): ConservativeModeConfig => {
	const enabled = process.env.AI_CONSERVATIVE_MODE === 'true';
	const maxRiskLevel = parseInt(process.env.AI_MAX_RISK_LEVEL || '2', 10) as 0 | 1 | 2 | 3 | 4;
	
	return {
		enabled,
		disableAutoPrompts: process.env.AI_DISABLE_AUTO_PROMPTS === 'true',
		disableHighRiskPlugins: process.env.AI_DISABLE_HIGH_RISK_PLUGINS === 'true',
		maxRiskLevel: Math.min(maxRiskLevel, 4) as 0 | 1 | 2 | 3 | 4,
		disabledPlugins: process.env.AI_DISABLED_PLUGINS?.split(',') || [],
		disabledTasks: process.env.AI_DISABLED_TASKS?.split(',') || []
	};
};

// 全局保守模式配置（可以从数据库或环境变量读取）
let conservativeModeConfig: ConservativeModeConfig = getConservativeModeFromEnv();

/**
 * 检查保守模式是否启用
 */
export function isConservativeModeEnabled(): boolean {
	return conservativeModeConfig.enabled;
}

/**
 * 检查是否可以执行某个任务
 */
export function canExecuteTask(taskType: string): boolean {
	if (!conservativeModeConfig.enabled) return true;

	// 检查任务是否在禁用列表中
	if (conservativeModeConfig.disabledTasks.includes(taskType)) {
		return false;
	}

	return true;
}

/**
 * 检查是否可以使用某个插件
 */
export function canUsePlugin(pluginType: string): boolean {
	if (!conservativeModeConfig.enabled) return true;

	// 检查插件是否在禁用列表中
	if (conservativeModeConfig.disabledPlugins.includes(pluginType)) {
		return false;
	}

	// 如果启用高风险插件禁用，检查是否为高风险插件
	if (conservativeModeConfig.disableHighRiskPlugins) {
		const highRiskPlugins = [
			'counter_perspective', // 对立视角可能引发争议
			'practice_framework' // 实践框架可能涉及行动建议
		];
		if (highRiskPlugins.includes(pluginType)) {
			return false;
		}
	}

	return true;
}

/**
 * 检查是否可以触发自动提示
 */
export function canTriggerAutoPrompt(): boolean {
	if (!conservativeModeConfig.enabled) return true;
	return !conservativeModeConfig.disableAutoPrompts;
}

/**
 * 检查风险等级是否在允许范围内
 */
export function isRiskLevelAllowed(riskLevel: number): boolean {
	if (!conservativeModeConfig.enabled) return true;
	return riskLevel <= conservativeModeConfig.maxRiskLevel;
}

/**
 * 更新保守模式配置（需要管理员权限）
 */
export function updateConservativeModeConfig(config: Partial<ConservativeModeConfig>): void {
	conservativeModeConfig = {
		...conservativeModeConfig,
		...config
	};
}

/**
 * 获取当前保守模式配置
 */
export function getConservativeModeConfig(): Readonly<ConservativeModeConfig> {
	return { ...conservativeModeConfig };
}

/**
 * 重新加载保守模式配置（从环境变量或数据库）
 */
export function reloadConservativeModeConfig(): void {
	conservativeModeConfig = getConservativeModeFromEnv();
	// TODO: 如果配置存储在数据库，可以从数据库加载
}













