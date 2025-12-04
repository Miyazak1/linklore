import { prisma } from '../lib/db/client';

// 简单的加密函数（与 API 中的 encodeSecret 一致）
function encodeSecret(plain: string) {
	const salt = process.env.SESSION_SECRET || 'dev';
	return Buffer.from(`${salt}:${plain}`).toString('base64');
}

async function setSystemAiConfig() {
	const args = process.argv.slice(2);
	
	if (args.length < 3) {
		console.log('用法: npx tsx scripts/set-system-ai-config.ts <provider> <model> <apiKey> [apiEndpoint]');
		console.log('示例: npx tsx scripts/set-system-ai-config.ts siliconflow deepseek-chat sk-xxx');
		console.log('Provider: openai, qwen, siliconflow');
		process.exit(1);
	}
	
	const [provider, model, apiKey, apiEndpoint] = args;
	
	if (!['openai', 'qwen', 'siliconflow'].includes(provider)) {
		console.error('Provider 必须是: openai, qwen, siliconflow');
		process.exit(1);
	}
	
	if (apiKey.length < 10) {
		console.error('API Key 太短，至少需要10个字符');
		process.exit(1);
	}
	
	try {
		// 查找管理员用户
		const admin = await prisma.user.findFirst({
			where: { role: 'admin' }
		});
		
		if (!admin) {
			console.error('未找到管理员用户，请先运行 set-admin.ts');
			process.exit(1);
		}
		
		const encApiKey = encodeSecret(apiKey);
		
		// 检查是否已有系统配置
		const existing = await prisma.systemAiConfig.findFirst({
			orderBy: { updatedAt: 'desc' }
		});
		
		if (existing) {
			await prisma.systemAiConfig.update({
				where: { id: existing.id },
				data: {
					provider,
					model,
					encApiKey,
					apiEndpoint: apiEndpoint || null,
					updatedBy: admin.id
				}
			});
			console.log('✅ 系统 AI 配置已更新');
		} else {
			await prisma.systemAiConfig.create({
				data: {
					provider,
					model,
					encApiKey,
					apiEndpoint: apiEndpoint || null,
					updatedBy: admin.id
				}
			});
			console.log('✅ 系统 AI 配置已创建');
		}
		
		console.log(`Provider: ${provider}`);
		console.log(`Model: ${model}`);
		console.log(`API Endpoint: ${apiEndpoint || '默认'}`);
		console.log(`更新者: ${admin.email}`);
	} catch (err: any) {
		console.error('设置失败:', err.message);
		process.exit(1);
	}
}

setSystemAiConfig()
	.then(() => {
		process.exit(0);
	})
	.catch((err) => {
		console.error('错误:', err);
		process.exit(1);
	});



