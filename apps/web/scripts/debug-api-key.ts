/**
 * 调试 API Key 编码/解码问题
 * 运行方式: cd apps/web; npx tsx scripts/debug-api-key.ts
 */

import { prisma } from '../lib/db/client';
import { getApiKeyFromConfig } from '../lib/ai/adapters';

function encodeSecret(plain: string, salt: string): string {
	return Buffer.from(`${salt}:${plain}`).toString('base64');
}

function decodeSecret(encrypted: string, salt: string): string {
	try {
		const decoded = Buffer.from(encrypted, 'base64').toString('utf-8');
		if (decoded.startsWith(`${salt}:`)) {
			return decoded.slice(salt.length + 1);
		}
		return decoded; // 返回解码后的字符串，即使没有 salt 前缀
	} catch (e) {
		return encrypted; // 如果 base64 解码失败，返回原始值
	}
}

async function debugApiKey() {
	console.log('=== 调试 API Key 编码/解码问题 ===\n');

	try {
		// 1. 获取系统配置
		const systemConfig = await prisma.systemAiConfig.findFirst({
			orderBy: { updatedAt: 'desc' }
		});

		if (!systemConfig || !systemConfig.encApiKey) {
			console.log('❌ 未找到系统AI配置或API Key');
			return;
		}

		console.log('✅ 找到系统配置:');
		console.log(`  提供商: ${systemConfig.provider}`);
		console.log(`  模型: ${systemConfig.model}`);
		console.log(`  加密后的 API Key 长度: ${systemConfig.encApiKey.length}`);
		console.log(`  加密后的 API Key 前20位: ${systemConfig.encApiKey.substring(0, 20)}...`);

		// 2. 检查当前 SESSION_SECRET
		const currentSalt = process.env.SESSION_SECRET || 'dev';
		console.log(`\n✅ 当前 SESSION_SECRET: "${currentSalt}" (长度: ${currentSalt.length})`);

		// 3. 尝试使用当前 SESSION_SECRET 解码
		console.log(`\n🔍 尝试使用当前 SESSION_SECRET 解码...`);
		const decodedWithCurrent = decodeSecret(systemConfig.encApiKey, currentSalt);
		console.log(`  解码后长度: ${decodedWithCurrent.length}`);
		console.log(`  解码后前20位: ${decodedWithCurrent.substring(0, 20)}...`);
		console.log(`  是否以当前 SESSION_SECRET 开头: ${decodedWithCurrent.startsWith(`${currentSalt}:`) ? '是' : '否'}`);

		// 4. 如果解码后的字符串不以 SESSION_SECRET 开头，说明 SESSION_SECRET 可能不一致
		if (!decodedWithCurrent.startsWith(`${currentSalt}:`)) {
			console.log(`\n⚠️  警告：解码后的字符串不以当前 SESSION_SECRET 开头！`);
			console.log(`  这可能意味着：`);
			console.log(`  1. SESSION_SECRET 环境变量与保存配置时不一致`);
			console.log(`  2. 或者数据被其他方式编码了`);
			
			// 尝试从解码后的字符串中提取可能的 SESSION_SECRET
			if (decodedWithCurrent.includes(':')) {
				const possibleSalt = decodedWithCurrent.split(':')[0];
				console.log(`\n💡 检测到可能的 SESSION_SECRET: "${possibleSalt}" (长度: ${possibleSalt.length})`);
				console.log(`  尝试使用这个 SESSION_SECRET 解码...`);
				const apiKeyWithPossibleSalt = decodedWithCurrent.slice(possibleSalt.length + 1);
				console.log(`  提取的 API Key 长度: ${apiKeyWithPossibleSalt.length}`);
				console.log(`  提取的 API Key 前20位: ${apiKeyWithPossibleSalt.substring(0, 20)}...`);
				console.log(`  是否以 sk- 开头: ${apiKeyWithPossibleSalt.startsWith('sk-') ? '是 ✅' : '否 ❌'}`);
			}
		} else {
			// 5. 如果解码成功，提取 API Key
			const apiKey = decodedWithCurrent.slice(currentSalt.length + 1);
			console.log(`\n✅ 解码成功！`);
			console.log(`  API Key 长度: ${apiKey.length}`);
			console.log(`  API Key 前20位: ${apiKey.substring(0, 20)}...`);
			console.log(`  是否以 sk- 开头: ${apiKey.startsWith('sk-') ? '是 ✅' : '否 ❌'}`);
			
			// 检查是否看起来像 base64
			if (apiKey.endsWith('=') || apiKey.endsWith('==') || apiKey.endsWith('===')) {
				console.log(`\n⚠️  API Key 看起来像 base64 编码（以 = 结尾）`);
				try {
					const doubleDecoded = Buffer.from(apiKey, 'base64').toString('utf-8');
					console.log(`  尝试再次 base64 解码:`);
					console.log(`    长度: ${doubleDecoded.length}`);
					console.log(`    前20位: ${doubleDecoded.substring(0, 20)}...`);
					console.log(`    是否以 sk- 开头: ${doubleDecoded.startsWith('sk-') ? '是 ✅' : '否 ❌'}`);
				} catch (e) {
					console.log(`  再次 base64 解码失败: ${e}`);
				}
			}
		}

		// 6. 使用现有的解码函数
		console.log(`\n🔍 使用现有的 getApiKeyFromConfig 函数解码...`);
		try {
			const apiKeyFromFunction = getApiKeyFromConfig(systemConfig.encApiKey);
			console.log(`  解码后长度: ${apiKeyFromFunction.length}`);
			console.log(`  解码后前20位: ${apiKeyFromFunction.substring(0, 20)}...`);
			console.log(`  是否以 sk- 开头: ${apiKeyFromFunction.startsWith('sk-') ? '是 ✅' : '否 ❌'}`);
		} catch (err: any) {
			console.error(`  ❌ 解码失败: ${err.message}`);
		}

		// 7. 尝试不同的常见 SESSION_SECRET 值
		console.log(`\n🔍 尝试常见的 SESSION_SECRET 值...`);
		const commonSalts = ['dev', 'development', 'production', 'secret', 'linklore'];
		for (const salt of commonSalts) {
			if (salt === currentSalt) continue; // 跳过已经尝试过的
			const decoded = decodeSecret(systemConfig.encApiKey, salt);
			if (decoded.startsWith(`${salt}:`)) {
				const apiKey = decoded.slice(salt.length + 1);
				console.log(`  ✅ 使用 SESSION_SECRET="${salt}" 解码成功！`);
				console.log(`    API Key 长度: ${apiKey.length}`);
				console.log(`    API Key 前20位: ${apiKey.substring(0, 20)}...`);
				console.log(`    是否以 sk- 开头: ${apiKey.startsWith('sk-') ? '是 ✅' : '否 ❌'}`);
			}
		}

	} catch (err: any) {
		console.error('调试失败:', err);
		console.error(err.stack);
	} finally {
		await prisma.$disconnect();
	}
}

debugApiKey();



