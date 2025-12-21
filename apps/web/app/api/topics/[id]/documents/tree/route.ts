import { NextResponse } from 'next/server';
import { getDocumentTree } from '@/lib/topics/documentTree';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		
		if (!id || typeof id !== 'string') {
			return NextResponse.json({ error: 'Invalid topic ID' }, { status: 400 });
		}

		const tree = await getDocumentTree(id, false); // 不加载extractedText以提升性能
		
		// 找出话题的真正原始文档（第一个创建的parentId为null的文档）
		// 在DocumentTreeSelector中，我们只显示回复文档，不显示话题的原始文档
		// 所以需要过滤掉话题的原始文档，只返回它的子节点（回复）
		const trueOriginalNode = tree.find(node => !node.parentId);
		
		// Convert to client-friendly format
		// 如果找到了话题的原始文档，只返回它的子节点（回复文档）
		// 如果没有找到，返回所有根节点（降级处理）
		const documents = trueOriginalNode 
			? convertNode(trueOriginalNode.children)
			: tree.map(node => ({
				id: node.id,
				author: node.author,
				createdAt: node.createdAt.toISOString(),
				summaries: node.summaries,
				children: convertNode(node.children)
			}));

		return NextResponse.json({ documents }, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error: any) {
		console.error('[Documents Tree] Error:', error);
		return NextResponse.json({ error: error.message || 'Failed to load documents' }, { 
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

function convertNode(nodes: any[]): any[] {
	return nodes.map(node => ({
		id: node.id,
		author: node.author,
		createdAt: node.createdAt.toISOString(),
		summaries: node.summaries,
		children: convertNode(node.children)
	}));
}








