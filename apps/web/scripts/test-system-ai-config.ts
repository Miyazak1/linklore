/**
 * 测试系统AI配置
 * 运行方式: cd apps/web; npx tsx scripts/test-system-ai-config.ts
 */

import { prisma } from '../lib/db/client';
import { getApiKeyFromConfig } from '../lib/ai/adapters';

async function testSystemAiConfig() {
	console.log('=== 测试系统AI配置 ===\n');

	try {
		// 1. 检查系统配置
		const systemConfig = await prisma.systemAiConfig.findFirst({
			orderBy: { updatedAt: 'desc' }
		});

		if (!systemConfig) {
			console.log('❌ 未找到系统AI配置');
			console.log('\n请管理员在设置页面配置系统AI设置');
			return;
		}

		console.log('✅ 找到系统AI配置:');
		console.log(`  提供商: ${systemConfig.provider}`);
		console.log(`  模型: ${systemConfig.model}`);
		console.log(`  API端点: ${systemConfig.apiEndpoint || '默认'}`);
		console.log(`  最后更新: ${systemConfig.updatedAt.toISOString()}`);
		console.log(`  更新者: ${systemConfig.updatedBy}`);

		// 2. 检查API Key
		if (!systemConfig.encApiKey) {
			console.log('\n❌ 系统配置中没有API Key');
			return;
		}

		console.log('\n✅ API Key已配置');
		
		// 3. 尝试解码API Key
		try {
			const apiKey = getApiKeyFromConfig(systemConfig.encApiKey);
			console.log(`✅ API Key解码成功，长度: ${apiKey.length} 字符`);
			console.log(`   API Key前4位: ${apiKey.substring(0, 4)}...`);
			console.log(`   API Key后4位: ...${apiKey.substring(apiKey.length - 4)}`);
		} catch (err: any) {
			console.error(`❌ API Key解码失败: ${err.message}`);
			console.error('   可能原因: SESSION_SECRET环境变量不一致');
			return;
		}

		// 4. 检查SESSION_SECRET
		const sessionSecret = process.env.SESSION_SECRET || 'dev';
		console.log(`\n✅ SESSION_SECRET: ${sessionSecret.substring(0, 4)}... (长度: ${sessionSecret.length})`);

		// 5. 检查管理员用户
		const admin = await prisma.user.findUnique({
			where: { id: systemConfig.updatedBy }
		});

		if (admin) {
			console.log(`\n✅ 配置由管理员更新: ${admin.email} (${admin.role})`);
		} else {
			console.log(`\n⚠️  配置更新者不存在: ${systemConfig.updatedBy}`);
		}

		console.log('\n=== 测试完成 ===');
		console.log('如果API Key解码成功，但AI调用仍然失败，可能是：');
		console.log('1. API Key本身无效或已过期');
		console.log('2. 模型名称不正确');
		console.log('3. API端点配置错误');
		console.log('4. 网络连接问题');

	} catch (err: any) {
		console.error('测试失败:', err);
		console.error(err.stack);
	} finally {
		await prisma.$disconnect();
	}
}

testSystemAiConfig();



