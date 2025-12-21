import { prisma } from '@/lib/db/client';
import type {
	DecisionTree,
	IssueNode,
	PathStep,
	PathPattern,
	IssueResult
} from '@/types/daily-issue';

/**
 * 从数据库构建决策树
 * @param issueId 议题ID
 * @returns 决策树对象
 */
export async function buildTree(issueId: string): Promise<DecisionTree> {
	// 获取议题信息
	const issue = await prisma.dailyIssue.findUnique({
		where: { id: issueId },
		include: {
			nodes: {
				orderBy: [{ stage: 'asc' }, { order: 'asc' }]
			}
		}
	});

	if (!issue) {
		throw new Error(`Issue not found: ${issueId}`);
	}

	// 构建节点映射表
	const nodesMap = new Map<string, IssueNode>();
	let rootNode: IssueNode | null = null;

	for (const node of issue.nodes) {
		// 解析nextNodeKeys JSON数组
		const nextNodeKeys = Array.isArray(node.nextNodeKeys)
			? node.nextNodeKeys
			: typeof node.nextNodeKeys === 'string'
				? JSON.parse(node.nextNodeKeys)
				: [];

		const issueNode: IssueNode = {
			id: node.id,
			issueId: node.issueId,
			stage: node.stage,
			nodeKey: node.nodeKey,
			title: node.title,
			content: node.content,
			parentNodeKey: node.parentNodeKey,
			nextNodeKeys,
			isRoot: node.isRoot,
			order: node.order
		};

		nodesMap.set(node.nodeKey, issueNode);

		if (node.isRoot) {
			rootNode = issueNode;
		}
	}

	// 验证根节点存在
	if (!rootNode) {
		throw new Error(`No root node found for issue: ${issueId}`);
	}

	return {
		issue: {
			id: issue.id,
			date: issue.date,
			title: issue.title,
			caseDescription: issue.caseDescription,
			status: issue.status as 'draft' | 'published' | 'archived',
			difficulty: issue.difficulty ?? undefined,
			category: issue.category ?? undefined,
			createdAt: issue.createdAt,
			updatedAt: issue.updatedAt
		},
		nodes: nodesMap,
		rootNode
	};
}

/**
 * 获取下一节点
 * @param tree 决策树
 * @param currentNodeKey 当前节点key
 * @param selectedOption 用户选择的选项（nodeKey）
 * @returns 下一节点，如果不存在则返回null
 */
export function getNextNode(
	tree: DecisionTree,
	currentNodeKey: string,
	selectedOption: string
): IssueNode | null {
	const currentNode = tree.nodes.get(currentNodeKey);
	if (!currentNode) {
		throw new Error(`Node not found: ${currentNodeKey}`);
	}

	// 检查selectedOption是否在nextNodeKeys中
	if (!currentNode.nextNodeKeys.includes(selectedOption)) {
		throw new Error(
			`Invalid transition: ${currentNodeKey} -> ${selectedOption}`
		);
	}

	// 获取下一节点
	const nextNode = tree.nodes.get(selectedOption);
	if (!nextNode) {
		throw new Error(`Next node not found: ${selectedOption}`);
	}

	return nextNode;
}

/**
 * 验证路径有效性
 * @param tree 决策树
 * @param path 用户路径
 * @returns 是否有效
 */
export function validatePath(
	tree: DecisionTree,
	path: PathStep[]
): { valid: boolean; error?: string } {
	if (path.length === 0) {
		return { valid: false, error: 'Path is empty' };
	}

	// 检查第一个节点是否是根节点
	const firstStep = path[0];
	const firstNode = tree.nodes.get(firstStep.nodeKey);
	if (!firstNode) {
		return { valid: false, error: `First node not found: ${firstStep.nodeKey}` };
	}
	if (!firstNode.isRoot) {
		return { valid: false, error: 'First node must be root' };
	}

	// 检查路径连续性
	for (let i = 0; i < path.length - 1; i++) {
		const currentStep = path[i];
		const nextStep = path[i + 1];

		const currentNode = tree.nodes.get(currentStep.nodeKey);
		if (!currentNode) {
			return {
				valid: false,
				error: `Node not found at step ${i}: ${currentStep.nodeKey}`
			};
		}

		// 检查下一节点是否在当前节点的nextNodeKeys中
		if (!currentNode.nextNodeKeys.includes(nextStep.nodeKey)) {
			return {
				valid: false,
				error: `Invalid transition at step ${i}: ${currentStep.nodeKey} -> ${nextStep.nodeKey}`
			};
		}

		// 检查阶段是否递增（允许相同阶段，但不允许倒退）
		if (nextStep.stage < currentStep.stage) {
			return {
				valid: false,
				error: `Stage cannot decrease: ${currentStep.stage} -> ${nextStep.stage}`
			};
		}
	}

	return { valid: true };
}

/**
 * 查找匹配的结果模板
 * @param issueId 议题ID
 * @param path 用户路径
 * @returns 匹配的结果模板，如果不存在则返回null
 */
export async function findResultTemplate(
	issueId: string,
	path: PathStep[]
): Promise<IssueResult | null> {
	// 获取所有结果模板
	const results = await prisma.issueResult.findMany({
		where: { issueId },
		orderBy: { createdAt: 'desc' }
	});

	if (results.length === 0) {
		return null;
	}

	// 提取路径的nodeKeys
	const pathNodeKeys = path.map((step) => step.nodeKey);

	// 匹配算法：最长路径匹配
	let bestMatch: IssueResult | null = null;
	let bestMatchLength = 0;

	for (const result of results) {
		const pattern = result.pathPattern as PathPattern;

		// 检查阶段匹配
		const pathStages = path.map((step) => step.stage);
		const patternStages = pattern.stages || [];
		if (
			patternStages.length > 0 &&
			!patternStages.every((stage) => pathStages.includes(stage))
		) {
			continue;
		}

		// 检查节点key匹配（按顺序）
		const patternNodeKeys = pattern.nodeKeys || [];
		if (patternNodeKeys.length === 0) {
			// 如果没有指定节点key，匹配所有路径
			if (patternNodeKeys.length > bestMatchLength) {
				bestMatch = result;
				bestMatchLength = patternNodeKeys.length;
			}
			continue;
		}

		// 检查路径是否包含所有pattern节点（按顺序）
		let patternIndex = 0;
		for (const nodeKey of pathNodeKeys) {
			if (patternIndex < patternNodeKeys.length) {
				if (nodeKey === patternNodeKeys[patternIndex]) {
					patternIndex++;
				}
			}
		}

		// 如果所有pattern节点都匹配了
		if (patternIndex === patternNodeKeys.length) {
			if (patternNodeKeys.length > bestMatchLength) {
				bestMatch = result;
				bestMatchLength = patternNodeKeys.length;
			}
		}
	}

	return bestMatch;
}

/**
 * 获取指定阶段的所有节点
 * @param tree 决策树
 * @param stage 阶段编号
 * @returns 该阶段的所有节点（按order排序）
 */
export function getNodesByStage(
	tree: DecisionTree,
	stage: number
): IssueNode[] {
	const nodes: IssueNode[] = [];
	for (const node of tree.nodes.values()) {
		if (node.stage === stage) {
			nodes.push(node);
		}
	}
	return nodes.sort((a, b) => a.order - b.order);
}

/**
 * 检查路径是否完成（到达最后一个阶段）
 * @param tree 决策树
 * @param path 用户路径
 * @returns 是否完成
 */
export function isPathComplete(
	tree: DecisionTree,
	path: PathStep[]
): boolean {
	if (path.length === 0) {
		return false;
	}

	const lastStep = path[path.length - 1];
	const lastNode = tree.nodes.get(lastStep.nodeKey);

	if (!lastNode) {
		return false;
	}

	// 如果最后一个节点没有下一节点，或者阶段是5（最后一个阶段），则认为完成
	return lastNode.nextNodeKeys.length === 0 || lastNode.stage === 5;
}

