import { prisma } from '@/lib/db/client';
import { buildTree, validatePath } from './decisionTree';
import type {
	PathStep,
	ResultTemplate,
	IssueResult,
	DecisionTree
} from '@/types/daily-issue';
import { findResultTemplate } from './decisionTree';

/**
 * 生成结果页内容
 * @param issueId 议题ID
 * @param path 用户思考路径
 * @returns 结果页内容
 */
export async function generateResult(
	issueId: string,
	path: PathStep[]
): Promise<ResultTemplate> {
	// 构建决策树
	const tree = await buildTree(issueId);

	// 验证路径
	const validation = validatePath(tree, path);
	if (!validation.valid) {
		throw new Error(`Invalid path: ${validation.error}`);
	}

	// 查找匹配的结果模板
	const resultTemplate = await findResultTemplate(issueId, path);

	if (resultTemplate) {
		// 使用预定义模板
		const template = resultTemplate.resultTemplate as ResultTemplate;
		return {
			...template,
			pathSummary: generatePathSummary(tree, path)
		};
	}

	// 如果没有匹配的模板，动态生成
	return {
		tradeoff: describeTradeoff(tree, path),
		alternative: suggestAlternative(tree, path),
		question: generateQuestion(tree, path),
		pathSummary: generatePathSummary(tree, path)
	};
}

/**
 * 描述核心权衡点
 * @param tree 决策树
 * @param path 用户路径
 * @returns 权衡点描述
 */
export function describeTradeoff(
	tree: DecisionTree,
	path: PathStep[]
): string {
	// 分析路径中的关键选择点（阶段3和阶段4）
	const stage3Step = path.find((step) => step.stage === 3);
	const stage4Step = path.find((step) => step.stage === 4);

	if (!stage3Step || !stage4Step) {
		return '你在思考过程中做出了多个选择，每个选择都体现了你对不同价值的权衡。';
	}

	const stage3Node = tree.nodes.get(stage3Step.nodeKey);
	const stage4Node = tree.nodes.get(stage4Step.nodeKey);

	if (!stage3Node || !stage4Node) {
		return '你在思考过程中做出了多个选择，每个选择都体现了你对不同价值的权衡。';
	}

	// 提取阶段3的选择（解决方案）
	const solution = stage3Node.title || stage3Node.content;

	// 提取阶段4的选择（代价）
	const cost = stage4Node.title || stage4Node.content;

	return `在多次选择中，你选择了"${solution}"作为优先方案，并更愿意接受"${cost}"的代价。这表明你在权衡中更重视某些价值，而愿意在其他方面做出妥协。`;
}

/**
 * 建议其他思路
 * @param tree 决策树
 * @param path 用户路径
 * @returns 其他思路提示
 */
export function suggestAlternative(
	tree: DecisionTree,
	path: PathStep[]
): string {
	// 找到阶段3的选择
	const stage3Step = path.find((step) => step.stage === 3);
	if (!stage3Step) {
		return '如果从另一种视角出发，可能会在解决方案选择上做出不同判断。';
	}

	const stage3Node = tree.nodes.get(stage3Step.nodeKey);
	if (!stage3Node) {
		return '如果从另一种视角出发，可能会在解决方案选择上做出不同判断。';
	}

	// 获取阶段3的所有选项
	const stage3Nodes = Array.from(tree.nodes.values()).filter(
		(node) => node.stage === 3 && node.nodeKey !== stage3Step.nodeKey
	);

	if (stage3Nodes.length === 0) {
		return '如果从另一种视角出发，可能会在解决方案选择上做出不同判断。';
	}

	// 随机选择一个替代方案
	const alternative = stage3Nodes[0];
	const alternativeTitle = alternative.title || alternative.content;

	return `如果从另一种视角出发，可能会在第3步选择"${alternativeTitle}"，这会导致不同的权衡和结果。不同的选择反映了不同的价值优先级，没有绝对的对错。`;
}

/**
 * 生成开放式追问
 * @param tree 决策树
 * @param path 用户路径
 * @returns 开放式问题
 */
export function generateQuestion(
	tree: DecisionTree,
	path: PathStep[]
): string {
	// 找到阶段3的选择（核心分歧点）
	const stage3Step = path.find((step) => step.stage === 3);
	if (!stage3Step) {
		return '如果你要说服一个做出相反选择的人，你会从哪里开始？';
	}

	const stage3Node = tree.nodes.get(stage3Step.nodeKey);
	if (!stage3Node) {
		return '如果你要说服一个做出相反选择的人，你会从哪里开始？';
	}

	const solution = stage3Node.title || stage3Node.content;

	return `如果你要说服一个选择了不同方案的人（比如选择了与"${solution}"不同的方案），你会从哪里开始？你会如何解释你的权衡逻辑？`;
}

/**
 * 生成路径回放摘要
 * @param tree 决策树
 * @param path 用户路径
 * @returns 路径摘要
 */
export function generatePathSummary(
	tree: DecisionTree,
	path: PathStep[]
): string {
	if (path.length === 0) {
		return '';
	}

	const summaries: string[] = [];

	// 阶段0：案例呈现
	const stage0Step = path.find((step) => step.stage === 0);
	if (stage0Step) {
		summaries.push('你从案例呈现开始，了解了问题的基本事实。');
	}

	// 阶段1：现象理解
	const stage1Step = path.find((step) => step.stage === 1);
	if (stage1Step) {
		const stage1Node = tree.nodes.get(stage1Step.nodeKey);
		if (stage1Node) {
			const perspective = stage1Node.title || stage1Node.content;
			summaries.push(`你首先关注的是"${perspective}"。`);
		}
	}

	// 阶段2：归因拆解
	const stage2Step = path.find((step) => step.stage === 2);
	if (stage2Step) {
		const stage2Node = tree.nodes.get(stage2Step.nodeKey);
		if (stage2Node) {
			const attribution = stage2Node.title || stage2Node.content;
			summaries.push(`你认为核心原因更接近"${attribution}"。`);
		}
	}

	// 阶段3：解决方案选择
	const stage3Step = path.find((step) => step.stage === 3);
	if (stage3Step) {
		const stage3Node = tree.nodes.get(stage3Step.nodeKey);
		if (stage3Node) {
			const solution = stage3Node.title || stage3Node.content;
			summaries.push(`你选择了"${solution}"作为优先方案。`);
		}
	}

	// 阶段4：代价确认
	const stage4Step = path.find((step) => step.stage === 4);
	if (stage4Step) {
		const stage4Node = tree.nodes.get(stage4Step.nodeKey);
		if (stage4Node) {
			const cost = stage4Node.title || stage4Node.content;
			summaries.push(`你更愿意接受"${cost}"的代价。`);
		}
	}

	// 阶段5：边界追问
	const stage5Step = path.find((step) => step.stage === 5);
	if (stage5Step) {
		const stage5Node = tree.nodes.get(stage5Step.nodeKey);
		if (stage5Node) {
			const boundary = stage5Node.title || stage5Node.content;
			summaries.push(`你对长期判断是"${boundary}"。`);
		}
	}

	return summaries.join(' ');
}

