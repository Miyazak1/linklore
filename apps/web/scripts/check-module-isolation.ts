/**
 * 模块隔离检查工具
 * 
 * 检查代码是否遵循模块隔离规则
 * 
 * 使用方法：
 * pnpm tsx scripts/check-module-isolation.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createModuleLogger } from '../lib/utils/logger';

const log = createModuleLogger('ModuleIsolationChecker');

interface Violation {
	file: string;
	line: number;
	message: string;
	type: 'error' | 'warning';
}

const violations: Violation[] = [];

// 模块定义
const modules = {
	chat: {
		path: 'app/api/chat',
		components: 'components/chat',
		dbModels: ['ChatRoom', 'ChatMessage', 'ChatAnalysis', 'ChatMessageReference'],
		dbAccess: 'lib/modules/chat/db',
	},
	discussion: {
		path: 'app/api/topics',
		components: 'components/topic',
		dbModels: ['Topic', 'Document', 'Summary', 'Evaluation', 'Disagreement', 'ConsensusSnapshot', 'UserConsensus'],
	},
	trace: {
		path: 'app/api/traces',
		components: 'components/trace',
		dbModels: ['Trace', 'Citation', 'TraceAnalysis', 'Entry'],
	},
	library: {
		path: 'app/api/books',
		components: 'components/library',
		dbModels: ['Book', 'BookshelfItem', 'BookAsset'],
	},
};

/**
 * 检查文件内容
 */
function checkFile(filePath: string, content: string, relativePath: string) {
	const lines = content.split('\n');

	// 检查是否直接使用 prisma.xxx（跨模块访问）
	lines.forEach((line, index) => {
		const lineNum = index + 1;

		// 检查跨模块数据库访问
		Object.entries(modules).forEach(([moduleName, moduleConfig]) => {
			// 判断当前文件属于哪个模块
			let currentModule: string | null = null;
			Object.entries(modules).forEach(([mName, mConfig]) => {
				if (relativePath.includes(mConfig.path) || relativePath.includes(mConfig.components)) {
					currentModule = mName;
				}
			});

			// 如果当前文件属于目标模块，允许访问（模块内部访问）
			if (currentModule === moduleName) {
				return;
			}

			// 如果当前文件不属于任何模块（如 shared, lib/utils 等），允许访问
			if (!currentModule) {
				return;
			}

			// 检查是否直接访问其他模块的数据库模型（跨模块访问）
			moduleConfig.dbModels.forEach((model) => {
				const pattern = new RegExp(`prisma\\.${model.toLowerCase()}\\s*\\.`, 'i');
				if (pattern.test(line) && !line.includes('//')) {
					violations.push({
						file: relativePath,
						line: lineNum,
						message: `[${currentModule}] 直接访问 ${moduleName} 模块的数据库模型 ${model}，应使用模块的数据库访问层或通过 API`,
						type: 'error',
					});
				}
			});
		});

		// 检查是否在聊天模块中使用 prisma.chatRoom（应使用 chatDb）
		if (relativePath.includes('app/api/chat') || relativePath.includes('components/chat')) {
			if (/prisma\.chat(Room|Message|Analysis|MessageReference)/i.test(line) && !line.trim().startsWith('//')) {
				violations.push({
					file: relativePath,
					line: lineNum,
					message: '在聊天模块中应使用 chatDb 而不是 prisma.chatRoom/chatMessage',
					type: 'warning',
				});
			}
		}

		// 检查跨模块组件导入
		Object.entries(modules).forEach(([moduleName, moduleConfig]) => {
			// 判断当前文件属于哪个模块
			let currentModule: string | null = null;
			Object.entries(modules).forEach(([mName, mConfig]) => {
				if (relativePath.includes(mConfig.path) || relativePath.includes(mConfig.components)) {
					currentModule = mName;
				}
			});

			// 如果当前文件属于目标模块，允许导入（模块内部导入）
			if (currentModule === moduleName) {
				return;
			}

			// 检查是否直接导入其他模块的内部组件
			const importPattern = new RegExp(`from ['"]@/components/${moduleConfig.components.split('/')[1]}/`, 'i');
			if (importPattern.test(line)) {
				// 允许导入 shared 组件
				if (!line.includes('shared/components')) {
					violations.push({
						file: relativePath,
						line: lineNum,
						message: `[${currentModule || '未知模块'}] 直接导入 ${moduleName} 模块的内部组件，应使用 shared/components 或通过 props 传递`,
						type: 'warning',
					});
				}
			}
		});
	});
}

/**
 * 递归读取目录
 */
function readDirectory(dirPath: string, basePath: string = '') {
	const files = readdirSync(dirPath);

	files.forEach((file) => {
		const fullPath = join(dirPath, file);
		const relativePath = basePath ? join(basePath, file) : file;
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			// 跳过 node_modules, .next, dist 等目录
			if (['node_modules', '.next', 'dist', '.git'].includes(file)) {
				return;
			}
			readDirectory(fullPath, relativePath);
		} else if (stat.isFile()) {
			// 只检查 TypeScript/JavaScript 文件
			if (/\.(ts|tsx|js|jsx)$/.test(file)) {
				try {
					const content = readFileSync(fullPath, 'utf-8');
					checkFile(fullPath, content, relativePath);
				} catch (error) {
					log.error(`读取文件失败: ${relativePath}`, error as Error);
				}
			}
		}
	});
}

/**
 * 主函数
 */
function main() {
	console.log('🔍 开始检查模块隔离规则...\n');

	const projectRoot = join(__dirname, '..');
	const srcPath = join(projectRoot, 'app');
	const componentsPath = join(projectRoot, 'components');
	const libPath = join(projectRoot, 'lib');

	// 检查 app 目录
	if (statSync(srcPath).isDirectory()) {
		readDirectory(srcPath, 'app');
	}

	// 检查 components 目录
	if (statSync(componentsPath).isDirectory()) {
		readDirectory(componentsPath, 'components');
	}

	// 检查 lib 目录（排除 modules 目录，因为那是访问层）
	if (statSync(libPath).isDirectory()) {
		readDirectory(libPath, 'lib');
	}

	// 输出结果
	console.log(`\n📊 检查完成，发现 ${violations.length} 个问题\n`);

	if (violations.length === 0) {
		console.log('✅ 未发现违反模块隔离规则的问题\n');
		process.exit(0);
	}

	// 按类型分组
	const errors = violations.filter((v) => v.type === 'error');
	const warnings = violations.filter((v) => v.type === 'warning');

	if (errors.length > 0) {
		console.log(`❌ 错误 (${errors.length}):\n`);
		errors.forEach((v) => {
			console.log(`  ${v.file}:${v.line}`);
			console.log(`    ${v.message}\n`);
		});
	}

	if (warnings.length > 0) {
		console.log(`⚠️  警告 (${warnings.length}):\n`);
		warnings.forEach((v) => {
			console.log(`  ${v.file}:${v.line}`);
			console.log(`    ${v.message}\n`);
		});
	}

	// 如果有错误，退出码为 1
	process.exit(errors.length > 0 ? 1 : 0);
}

main();

