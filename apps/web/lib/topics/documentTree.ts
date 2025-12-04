import { prisma } from '@/lib/db/client';

export interface DocumentTreeNode {
	id: string;
	topicId: string;
	parentId: string | null;
	authorId: string;
	author: { email: string };
	fileKey: string;
	mime: string;
	size: number;
	createdAt: Date;
	extractedText: Buffer | null;
	summaries: Array<{
		id: string;
		title: string;
		overview: string;
		claims: any;
		keywords?: string[];
	}>;
	evaluations: Array<{
		id: string;
		scores: any;
		verdict: string;
		createdAt: Date;
	}>;
	children: DocumentTreeNode[];
	depth: number;
}

/**
 * 获取文档树（递归构建）
 */
export async function getDocumentTree(topicId: string): Promise<DocumentTreeNode[]> {
	const docs = await prisma.document.findMany({
		where: { topicId },
		include: {
			author: { select: { email: true } },
			summaries: { orderBy: { id: 'desc' }, take: 1 },
			evaluations: { orderBy: { createdAt: 'desc' }, take: 1 }
		},
		orderBy: { createdAt: 'asc' }
	});
	
	// Get topic for discipline
	const topic = await prisma.topic.findUnique({
		where: { id: topicId },
		select: { discipline: true }
	});

	// 找出话题的真正原始文档（第一个创建的parentId为null的文档）
	// 按创建时间排序，第一个parentId为null的文档是话题的原始文档
	const sortedDocs = [...docs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	const trueOriginalDoc = sortedDocs.find(d => !d.parentId);
	
	// 构建文档映射
	const docMap = new Map<string, DocumentTreeNode>();
	const rootDocs: DocumentTreeNode[] = [];
	const childrenMap = new Map<string, DocumentTreeNode[]>();

	// 初始化节点
	docs.forEach(doc => {
		const node: DocumentTreeNode = {
			id: doc.id,
			topicId: doc.topicId,
			parentId: doc.parentId,
			authorId: doc.authorId,
			author: doc.author,
			fileKey: doc.fileKey,
			mime: doc.mime,
			size: doc.size,
			createdAt: doc.createdAt,
			extractedText: doc.extractedText, // Include extractedText
			summaries: doc.summaries,
			evaluations: doc.evaluations,
			children: [],
			depth: 0
		};
		docMap.set(doc.id, node);

		if (!doc.parentId) {
			// 如果是话题的真正原始文档，作为根节点
			if (trueOriginalDoc && doc.id === trueOriginalDoc.id) {
				rootDocs.push(node);
			} else {
				// 其他parentId为null的文档（可能是数据错误），视为直接回复话题的原始文档
				// 将它们作为话题原始文档的子节点
				if (trueOriginalDoc) {
					if (!childrenMap.has(trueOriginalDoc.id)) {
						childrenMap.set(trueOriginalDoc.id, []);
					}
					childrenMap.get(trueOriginalDoc.id)!.push(node);
				} else {
					// 如果没有找到真正的原始文档，仍然作为根节点（降级处理）
					rootDocs.push(node);
				}
			}
		} else {
			if (!childrenMap.has(doc.parentId)) {
				childrenMap.set(doc.parentId, []);
			}
			childrenMap.get(doc.parentId)!.push(node);
		}
	});

	// 递归构建树并计算深度
	function buildTree(node: DocumentTreeNode, depth: number = 0): DocumentTreeNode {
		node.depth = depth;
		const children = childrenMap.get(node.id) || [];
		node.children = children.map(child => buildTree(child, depth + 1));
		return node;
	}

	return rootDocs.map(root => buildTree(root));
}

/**
 * 验证 parentId 是否有效
 * - 检查是否存在
 * - 检查是否属于同一话题
 * - 检查是否指向自己（更新时）
 * - 检查深度限制
 */
export async function validateParentId(
	parentId: string | null,
	topicId: string,
	currentDocId?: string
): Promise<{ valid: boolean; error?: string }> {
	if (!parentId) {
		return { valid: true }; // 主题文档，parentId 为 null
	}

	// 检查是否指向自己
	if (currentDocId && parentId === currentDocId) {
		return { valid: false, error: '文档不能回复自己' };
	}

	// 检查父文档是否存在
	const parent = await prisma.document.findUnique({
		where: { id: parentId },
		select: { id: true, topicId: true }
	});

	if (!parent) {
		return { valid: false, error: '父文档不存在' };
	}

	// 检查是否属于同一话题
	if (parent.topicId !== topicId) {
		return { valid: false, error: '父文档必须属于同一话题' };
	}

	// 检查深度限制（最大10层）
	const depth = await getDocumentDepth(parentId);
	if (depth >= 10) {
		return { valid: false, error: '回复深度超过限制（最大10层）' };
	}

	return { valid: true };
}

/**
 * 计算文档深度（从根节点到该文档的层数）
 */
export async function getDocumentDepth(documentId: string): Promise<number> {
	let depth = 0;
	let currentId: string | null = documentId;

	// 向上遍历到根节点
	while (currentId) {
		const doc = await prisma.document.findUnique({
			where: { id: currentId },
			select: { parentId: true }
		});

		if (!doc) break;
		if (!doc.parentId) break; // 到达根节点

		depth++;
		currentId = doc.parentId;

		// 防止无限循环（理论上不应该发生，但安全起见）
		if (depth > 20) {
			console.warn(`[DocumentTree] Depth calculation exceeded limit for document ${documentId}`);
			break;
		}
	}

	return depth;
}

/**
 * 获取文档路径（从根节点到该文档的ID序列）
 */
export async function getDocumentPath(documentId: string): Promise<string[]> {
	const path: string[] = [];
	let currentId: string | null = documentId;

	while (currentId) {
		const doc = await prisma.document.findUnique({
			where: { id: currentId },
			select: { id: true, parentId: true }
		});

		if (!doc) break;

		path.unshift(doc.id); // 添加到开头

		if (!doc.parentId) break; // 到达根节点
		currentId = doc.parentId;

		// 防止无限循环
		if (path.length > 20) {
			console.warn(`[DocumentTree] Path calculation exceeded limit for document ${documentId}`);
			break;
		}
	}

	return path;
}

