/**
 * 验证系统AI配置并测试实际调用
 * 运行方式: cd apps/web; npx tsx scripts/verify-ai-config.ts
 */

import { prisma } from '../lib/db/client';
import { getApiKeyFromConfig } from '../lib/ai/adapters';
import { callAiProvider } from '../lib/ai/adapters';

async function verifyAiConfig() {
	console.log('=== 验证系统AI配置 ===\n');

	try {
		// 1. 获取系统配置
		const systemConfig = await prisma.systemAiConfig.findFirst({
			orderBy: { updatedAt: 'desc' }
		});

		if (!systemConfig) {
			console.log('❌ 未找到系统AI配置');
			return;
		}

		console.log('✅ 系统配置:');
		console.log(`  提供商: ${systemConfig.provider}`);
		console.log(`  模型: ${systemConfig.model}`);
		console.log(`  API端点: ${systemConfig.apiEndpoint || '默认'}`);

		// 2. 解码API Key
		const apiKey = getApiKeyFromConfig(systemConfig.encApiKey);
		console.log(`\n✅ API Key解码成功，长度: ${apiKey.length}`);

		// 3. 测试实际API调用
		console.log(`\n🧪 测试API调用...`);
		console.log(`  端点: ${systemConfig.apiEndpoint || (systemConfig.provider === 'siliconflow' ? 'https://api.siliconflow.cn/v1' : 'default')}`);
		console.log(`  模型: ${systemConfig.model}`);
		
		try {
			const result = await callAiProvider(systemConfig.provider as any, {
				apiKey,
				model: systemConfig.model,
				prompt: '测试连接，请回复"OK"',
				maxTokens: 10,
				apiEndpoint: systemConfig.apiEndpoint || undefined
			});

			console.log(`\n✅ API调用成功！`);
			console.log(`  响应: ${result.text}`);
			console.log(`  使用Token: ${result.usage.totalTokens}`);
			
		} catch (err: any) {
			console.error(`\n❌ API调用失败:`);
			console.error(`  错误: ${err.message}`);
			
			// 诊断 401 错误
			if (err.message.includes('401') || err.message.includes('Invalid token') || err.message.includes('无效或已过期')) {
				console.log(`\n💡 401 错误诊断建议:`);
				console.log(`  1. 检查 API Key 是否正确（可能包含额外的空白字符）`);
				console.log(`  2. 检查 API Key 是否已过期或被撤销`);
				console.log(`  3. 检查 SESSION_SECRET 环境变量是否与保存配置时一致`);
				console.log(`  4. 尝试重新保存 API Key（确保没有复制额外的空格或换行符）`);
				console.log(`\n  当前 API Key 信息:`);
				console.log(`    - 长度: ${apiKey.length} 字符`);
				console.log(`    - 前4位: ${apiKey.substring(0, 4)}...`);
				console.log(`    - 后4位: ...${apiKey.substring(apiKey.length - 4)}`);
				console.log(`    - 是否包含换行符: ${apiKey.includes('\n') || apiKey.includes('\r') ? '是' : '否'}`);
				console.log(`    - 是否包含前后空格: ${apiKey !== apiKey.trim() ? '是' : '否'}`);
				console.log(`    - 是否以 sk- 开头: ${apiKey.startsWith('sk-') ? '是' : '否'}`);
				console.log(`    - 是否看起来像 base64: ${(apiKey.endsWith('=') || apiKey.endsWith('==') || apiKey.endsWith('===')) ? '是（可能需要再次解码）' : '否'}`);
				
				// 如果看起来像 base64，尝试再次解码
				if (apiKey.endsWith('=') || apiKey.endsWith('==') || apiKey.endsWith('===')) {
					try {
						const doubleDecoded = Buffer.from(apiKey, 'base64').toString('utf-8');
						if (doubleDecoded.length > 0 && (doubleDecoded.startsWith('sk-') || doubleDecoded.length >= 20)) {
							console.log(`\n  💡 检测到 API Key 可能是双重编码！`);
							console.log(`    尝试再次 base64 解码后:`);
							console.log(`    - 长度: ${doubleDecoded.length} 字符`);
							console.log(`    - 前4位: ${doubleDecoded.substring(0, 4)}...`);
							console.log(`    - 是否以 sk- 开头: ${doubleDecoded.startsWith('sk-') ? '是' : '否'}`);
							console.log(`\n  💡 建议：重新保存 API Key，确保输入的是原始 API Key（不是 base64 编码的）`);
						}
					} catch (e) {
						// 忽略解码错误
					}
				}
			} else if (err.message.includes('模型') || err.message.includes('model')) {
				console.log(`\n💡 模型相关错误建议:`);
				console.log(`  1. 检查模型名称是否正确`);
				console.log(`  2. 检查你的账户是否有权限使用该模型`);
				console.log(`  3. 尝试使用其他模型，如：deepseek-chat, Qwen/Qwen2.5-72B-Instruct`);
			}
		}

	} catch (err: any) {
		console.error('验证失败:', err);
		console.error(err.stack);
	} finally {
		await prisma.$disconnect();
	}
}

verifyAiConfig();

