import { prisma } from '@/lib/db/client';
import { callAiProvider, getApiKeyFromConfig, type AiProvider } from './adapters';

type RouteInput = {
	userId: string | null;
	task: 'summarize' | 'evaluate' | 'moderate';
	estimatedMaxCostCents: number;
	prompt: string;
};

export async function routeAiCall(input: RouteInput) {
	// Budget checks (simplified)
	// 对于管理员任务（如生成议题），使用更高的成本限制
	const isAdminTask = input.estimatedMaxCostCents > 100;
	const jobCap = isAdminTask 
		? parseInt(process.env.AI_JOB_COST_LIMIT_CENTS || '500', 10) // 管理员任务：500分（5元）
		: parseInt(process.env.AI_JOB_COST_LIMIT_CENTS || '50', 10); // 普通任务：50分（0.5元）
	
	if (input.estimatedMaxCostCents > jobCap) {
		throw new Error(`任务超过单次成本上限（${jobCap}分），请调整任务规模或联系管理员提高限制`);
	}
	
	// 优先使用系统配置（管理员的配置）
	let systemConfig = await prisma.systemAiConfig.findFirst({
		orderBy: { updatedAt: 'desc' }
	});
	
	console.log(`[AI Router] System config found: ${!!systemConfig}`);
	if (systemConfig) {
		console.log(`[AI Router] Using system config: provider=${systemConfig.provider}, model=${systemConfig.model}, hasApiKey=${!!systemConfig.encApiKey}, endpoint=${systemConfig.apiEndpoint || 'default'}`);
	}
	
	// 如果没有系统配置，尝试使用管理员的用户配置
	if (!systemConfig) {
		console.log(`[AI Router] No system config, checking admin user config...`);
		const admin = await prisma.user.findFirst({
			where: { role: 'admin' },
			include: { 
				// 这里需要关联 UserAiConfig，但 Prisma 关系可能不存在
				// 我们直接查询
			}
		});
		
		if (admin) {
			const adminConfig = await prisma.userAiConfig.findUnique({
				where: { userId: admin.id }
			});
			
			if (adminConfig) {
				console.log(`[AI Router] Using admin user config: provider=${adminConfig.provider}, model=${adminConfig.model}`);
				// 将管理员的配置转换为系统配置格式
				systemConfig = {
					id: adminConfig.id,
					provider: adminConfig.provider,
					model: adminConfig.model,
					encApiKey: adminConfig.encApiKey,
					apiEndpoint: adminConfig.apiEndpoint,
					updatedBy: admin.id,
					updatedAt: adminConfig.createdAt,
					createdAt: adminConfig.createdAt
				} as any;
			} else {
				console.log(`[AI Router] Admin user has no AI config`);
			}
		} else {
			console.log(`[AI Router] No admin user found`);
		}
	}
	
	// 如果用户有自己的配置且不是管理员，可以使用（但这里我们统一使用系统配置）
	// const userConfig = input.userId && !systemConfig
	// 	? await prisma.userAiConfig.findUnique({ where: { userId: input.userId } })
	// 	: null;
	
	// 使用系统配置或环境变量
	const provider = (systemConfig?.provider || process.env.AI_DEFAULT_PROVIDER || 'siliconflow') as AiProvider;
	const model = systemConfig?.model || process.env.AI_DEFAULT_MODEL || 'deepseek-chat';
	const apiEndpoint = systemConfig?.apiEndpoint || undefined;
	
	// Get API key
	let apiKey: string;
	if (systemConfig?.encApiKey) {
		try {
			apiKey = getApiKeyFromConfig(systemConfig.encApiKey);
			console.log(`[AI Router] API Key decoded successfully, length: ${apiKey.length}`);
		} catch (err: any) {
			console.error(`[AI Router] Failed to decode API key:`, err.message);
			throw new Error(`API Key 解码失败: ${err.message}`);
		}
	} else {
		// Fallback to environment variable
		apiKey = process.env.AI_API_KEY || '';
		console.log(`[AI Router] Using environment variable API key, length: ${apiKey.length}`);
		if (!apiKey) {
			throw new Error('未配置 AI API Key，请管理员在设置页面配置系统 AI API Key');
		}
	}
	
	console.log(`[AI Router] Making AI call: provider=${provider}, model=${model}, endpoint=${apiEndpoint || 'default'}`);

	// Make actual AI call
	try {
		console.log(`[AI Router] Calling AI provider with model: ${model}`);
		// 根据任务类型和估算成本调整maxTokens
		// 生成完整议题需要更多token
		const maxTokens = input.estimatedMaxCostCents > 200 
			? 4000  // 高成本任务（如生成议题）：4000 tokens
			: input.estimatedMaxCostCents > 100
			? 3000  // 中等成本任务：3000 tokens
			: 2000; // 普通任务：2000 tokens
		
		const result = await callAiProvider(provider, {
			apiKey,
			model,
			prompt: input.prompt,
			maxTokens,
			temperature: 0.7,
			apiEndpoint
		});
		console.log(`[AI Router] AI call successful, response length: ${result.text.length}`);

		// Log usage
		await prisma.aiUsageLog.create({
			data: {
				userId: input.userId || 'anonymous',
				provider,
				model,
				promptTokens: result.usage.promptTokens,
				completionTokens: result.usage.completionTokens,
				costCents: result.usage.costCents,
				status: 'success'
			}
		});

		return {
			text: result.text,
			usage: {
				prompt: result.usage.promptTokens,
				completion: result.usage.completionTokens,
				costCents: result.usage.costCents
			}
		};
	} catch (err: any) {
		// Log error
		await prisma.aiUsageLog.create({
			data: {
				userId: input.userId || 'anonymous',
				provider,
				model,
				promptTokens: 0,
				completionTokens: 0,
				costCents: 0,
				status: `error: ${err.message}`
			}
		});

		// Return error message
		throw new Error(`AI 调用失败: ${err.message}`);
	}
}


