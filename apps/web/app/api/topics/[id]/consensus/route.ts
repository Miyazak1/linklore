import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { routeAiCall } from '@/lib/ai/router';
import { getDocumentTree } from '@/lib/topics/documentTree';
import { checkDocumentQuality } from '@/lib/processing/documentQuality';
import { trackConsensus } from '@/lib/processing/consensusTracker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const topic = await prisma.topic.findUnique({ where: { id } });
		if (!topic) return NextResponse.json({ error: '话题不存在' }, { status: 404 });

		// 1. 检查最新快照
		const latestSnapshot = await prisma.consensusSnapshot.findFirst({
			where: { topicId: id },
			orderBy: { snapshotAt: 'desc' }
		});

		// 2. 检查是否有新文档（比较文档数量或最后更新时间）
		const lastDoc = await prisma.document.findFirst({
			where: { topicId: id },
			orderBy: { createdAt: 'desc' },
			select: { createdAt: true }
		});

		// 3. 优先检查是否有用户对共识数据（新方案）
		const userConsensusRecords = await prisma.userConsensus.findMany({
			where: { topicId: id },
			select: {
				consensus: true,
				disagreements: true,
				docIds: true
			}
		});

		// 4. 如果有用户对共识数据，优先使用新方案聚合
		if (userConsensusRecords.length > 0) {
			// 获取所有文档以建立 docId -> docIndex 映射
			const allDocs = await prisma.document.findMany({
				where: { topicId: id },
				orderBy: { createdAt: 'asc' },
				select: { id: true }
			});
			const docIdToIndex = new Map<string, number>();
			allDocs.forEach((doc, idx) => {
				docIdToIndex.set(doc.id, idx + 1);
			});

			// 聚合所有用户对的共识和分歧
			const consensusMap = new Map<string, { text: string; supportCount: number; docIndices: Set<number> }>();
			const allDisagreements: Array<{ claim1: string; claim2: string; docIndices: number[]; description?: string }> = [];

			userConsensusRecords.forEach(record => {
				const consensus = (record.consensus as any) || [];
				const disagreements = (record.disagreements as any) || [];
				const docIds = (record.docIds as string[]) || [];

				// 处理共识点（去重并合并）
				consensus.forEach((item: any) => {
					const text = item.text?.trim();
					if (!text) return;
					
					const existing = consensusMap.get(text);
					if (existing) {
						// 合并文档索引
						docIds.forEach((docId: string) => {
							const idx = docIdToIndex.get(docId);
							if (idx) existing.docIndices.add(idx);
						});
						existing.supportCount = existing.docIndices.size;
					} else {
						const docIndices = new Set<number>();
						docIds.forEach((docId: string) => {
							const idx = docIdToIndex.get(docId);
							if (idx) docIndices.add(idx);
						});
						consensusMap.set(text, {
							text,
							supportCount: docIndices.size,
							docIndices
						});
					}
				});

				// 处理分歧点
				disagreements.forEach((item: any) => {
					if (item.claim1 && item.claim2) {
						const doc1Idx = item.doc1Id ? docIdToIndex.get(item.doc1Id) : undefined;
						const doc2Idx = item.doc2Id ? docIdToIndex.get(item.doc2Id) : undefined;
						allDisagreements.push({
							claim1: item.claim1,
							claim2: item.claim2,
							docIndices: [doc1Idx || 1, doc2Idx || 2].filter((idx): idx is number => idx !== undefined),
							description: item.description
						});
					}
				});
			});

			const allConsensus = Array.from(consensusMap.values()).map(item => ({
				text: item.text,
				supportCount: item.supportCount,
				docIndices: Array.from(item.docIndices).sort((a, b) => a - b)
			}));

			// 使用最新快照或实时计算
			let snapshot = latestSnapshot ? {
				consensusScore: latestSnapshot.consensusScore,
				divergenceScore: latestSnapshot.divergenceScore,
				trend: (latestSnapshot.consensusData as any)?.trend || 'stable',
				snapshotAt: latestSnapshot.snapshotAt
			} : null;

			// 如果没有快照或需要更新，实时计算共识度
			const needsReanalysis = !latestSnapshot || 
				!latestSnapshot.consensusScore || 
				latestSnapshot.consensusScore === null ||
				(lastDoc && latestSnapshot && lastDoc.createdAt > latestSnapshot.snapshotAt);

			if (needsReanalysis) {
				// 实时计算话题级别共识度
				try {
					const { calculateTopicConsensus } = await import('@/lib/processing/topicConsensusAggregator');
					const topicConsensus = await calculateTopicConsensus(id);
					
					// 获取历史快照以计算趋势
					const recentSnapshots = await prisma.consensusSnapshot.findMany({
						where: { topicId: id },
						orderBy: { snapshotAt: 'desc' },
						take: 5
					});
					
					// 计算趋势
					const previousScore = recentSnapshots[0]?.consensusScore;
					let trend: 'converging' | 'diverging' | 'stable' = 'stable';
					if (previousScore !== null && previousScore !== undefined) {
						const diff = topicConsensus.consensusScore - previousScore;
						const threshold = 0.05;
						if (diff > threshold) {
							trend = 'converging';
						} else if (diff < -threshold) {
							trend = 'diverging';
						}
					}
					
					snapshot = {
						consensusScore: topicConsensus.consensusScore,
						divergenceScore: topicConsensus.divergenceScore,
						trend,
						snapshotAt: new Date()
					};
					
					console.log(`[Consensus API] Real-time calculated consensus: ${topicConsensus.consensusScore}, divergence: ${topicConsensus.divergenceScore}`);
				} catch (err: any) {
					console.error('[Consensus API] Failed to calculate topic consensus:', err);
				}
				
				// 异步触发快照更新（不阻塞响应）
				const { enqueueTrackConsensus } = await import('@/lib/queue/jobs');
				enqueueTrackConsensus(id).catch(err => {
					console.error('[Consensus API] Failed to trigger snapshot update:', err);
				});
			}

			// 构建快照对象（确保包含snapshotAt）
			const snapshotData = snapshot ? {
				consensusScore: snapshot.consensusScore,
				divergenceScore: snapshot.divergenceScore,
				trend: snapshot.trend,
				snapshotAt: snapshot.snapshotAt instanceof Date 
					? snapshot.snapshotAt.toISOString() 
					: typeof snapshot.snapshotAt === 'string' 
						? snapshot.snapshotAt 
						: new Date().toISOString()
			} : null;

			return NextResponse.json({
				consensus: allConsensus,
				unverified: [],
				totalDocs: allDocs.length,
				qualityDocs: allDocs.length,
				snapshot: snapshotData
			}, {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 5. 如果没有用户对共识数据，检查是否需要重新分析（旧方案作为后备）
		const needsReanalysis = !latestSnapshot || 
			!latestSnapshot.consensusScore || 
			latestSnapshot.consensusScore === null ||
			(lastDoc && latestSnapshot && lastDoc.createdAt > latestSnapshot.snapshotAt);

		if (!needsReanalysis && latestSnapshot) {
			// 使用已有快照（旧方案）
			return NextResponse.json({
				consensus: [],
				disagreements: [],
				unverified: [],
				totalDocs: 0,
				qualityDocs: 0,
				snapshot: {
					consensusScore: latestSnapshot.consensusScore,
					divergenceScore: latestSnapshot.divergenceScore,
					trend: (latestSnapshot.consensusData as any)?.trend || 'stable',
					snapshotAt: latestSnapshot.snapshotAt
				}
			}, {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 6. 如果没有用户对共识数据且需要重新分析，使用旧方案（全局分析）
		// Get document tree (不加载extractedText以提升性能)
		const docTree = await getDocumentTree(id, false);
		
		// Get all documents with evaluations and summaries
		const allDocIds = new Set<string>();
		const collectIds = (nodes: typeof docTree) => {
			nodes.forEach(node => {
				allDocIds.add(node.id);
				if (node.children.length > 0) {
					collectIds(node.children as typeof docTree);
				}
			});
		};
		collectIds(docTree);

		const docs = await prisma.document.findMany({
			where: { id: { in: Array.from(allDocIds) } },
			include: {
				summaries: { orderBy: { id: 'desc' }, take: 1 },
				evaluations: { orderBy: { createdAt: 'desc' }, take: 1 },
				author: { select: { email: true } },
				topic: { select: { discipline: true } }
			},
			orderBy: { createdAt: 'asc' }
		});

		// Filter low-quality documents
		const qualityDocs = docs.filter(doc => {
			if (!doc.evaluations || doc.evaluations.length === 0) {
				return false; // 未评价的文档不参与分析
			}
			const qualityCheck = checkDocumentQuality(
				doc.evaluations[0],
				doc.topic?.discipline || undefined
			);
			return qualityCheck.isSufficient;
		});

		if (qualityDocs.length < 2) {
			return NextResponse.json({
				consensus: [],
				disagreements: [],
				unverified: [],
				totalDocs: docs.length,
				qualityDocs: qualityDocs.length,
				message: qualityDocs.length < 2 ? '需要至少2个高质量文档才能进行共识分析' : null
			}, {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Find original document (parentId is null)
		const originalDoc = qualityDocs.find(doc => !doc.parentId) || qualityDocs[0];
		const responseDocs = qualityDocs.filter(doc => doc.id !== originalDoc.id);

		// Collect all claims and summaries for AI analysis
		const claimsByDoc: Array<{ docIndex: number; docId: string; claims: string[]; overview: string; parentId: string | null }> = [];
		
		// Add original document first
		const originalSummary = originalDoc.summaries[0];
		if (originalSummary) {
			const claims = Array.isArray(originalSummary.claims) ? originalSummary.claims.filter((c: any): c is string => typeof c === 'string') : [];
			claimsByDoc.push({
				docIndex: 1,
				docId: originalDoc.id,
				claims,
				overview: originalSummary.overview || '',
				parentId: null
			});
		}

		// Add response documents
		responseDocs.forEach((doc, idx) => {
			const summary = doc.summaries[0];
			if (summary) {
				const claims = Array.isArray(summary.claims) ? summary.claims.filter((c: any): c is string => typeof c === 'string') : [];
				claimsByDoc.push({
					docIndex: idx + 2,
					docId: doc.id,
					claims,
					overview: summary.overview || '',
					parentId: doc.parentId
				});
			}
		});

		if (claimsByDoc.length < 2) {
			return NextResponse.json({
				consensus: [],
				disagreements: [],
				unverified: [],
				totalDocs: docs.length
			});
		}

		// Build prompt for AI consensus analysis
		// 文档 #1 是主题文档，其他是回复文档
		const originalDocData = claimsByDoc[0];
		const responseDocsData = claimsByDoc.slice(1);
		
		const originalDocText = `主题文档（文档 #1）:\n概述：${originalDocData.overview}\n观点：${originalDocData.claims.join('；')}`;
		const responseDocsText = responseDocsData
			.map((item) => `回复文档（文档 #${item.docIndex}）:\n概述：${item.overview}\n观点：${item.claims.join('；')}`)
			.join('\n\n');

		const prompt = `请分析以下文档的观点，重点关注**主题文档与回复文档之间的冲突和分歧**：

${originalDocText}

${responseDocsText}

请识别：
1. **共识点**：主题文档和回复文档都支持或表达相似的相同观点（至少2个文档支持）
2. **分歧点**：主题文档的观点与回复文档的观点之间的冲突和对立
   - 重点关注：回复文档如何反驳、质疑或补充主题文档的观点
   - 每个分歧点应明确说明：主题文档的观点 vs 回复文档的观点
3. **待验证点**：某个文档单独提出的观点，尚未得到其他文档支持或反驳

**重要**：
- 文档 #1 是主题文档（原始话题）
- 文档 #2 及以后是回复文档（对主题的评论和回应）
- 分歧点应重点分析主题文档与回复文档之间的观点冲突

请用JSON格式返回，格式如下：
{
  "consensus": [
    {
      "text": "共识观点描述",
      "supportCount": 支持该观点的文档数量,
      "docIndices": [文档编号数组，如 [1, 2, 3]]
    }
  ],
  "disagreements": [
    {
      "claim1": "主题文档的观点（来自文档 #1）",
      "claim2": "回复文档的观点（来自文档 #X，与主题文档观点冲突）",
      "docIndices": [1, X],
      "description": "简要说明冲突的具体内容"
    }
  ],
  "unverified": [
    {
      "text": "待验证的观点",
      "docIndex": 文档编号
    }
  ]
}

请仔细分析观点的语义，不要只看关键词，要理解观点的实际含义。重点关注主题文档与回复文档之间的观点冲突。`;

		// Call AI for consensus analysis
		let aiResult: {
			consensus: Array<{ text: string; supportCount: number; docIndices: number[] }>;
			disagreements: Array<{ 
				claim1: string; // 主题文档的观点
				claim2: string; // 回复文档的观点
				docIndices: number[]; // [1, X] 其中 1 是主题文档
				description?: string; // 冲突描述（可选）
			}>;
			unverified: Array<{ text: string; docIndex: number }>;
		};

		try {
			const result = await routeAiCall({
				userId: null, // Use system default AI
				task: 'summarize',
				estimatedMaxCostCents: 30,
				prompt
			});

			// Parse JSON from AI response
			const jsonMatch = result.text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				aiResult = JSON.parse(jsonMatch[0]);
			} else {
				throw new Error('AI返回格式不正确');
			}
		} catch (err: any) {
			console.error('[Consensus] AI analysis failed:', err);
			// Fallback to simple analysis if AI fails
			aiResult = {
				consensus: [],
				disagreements: [],
				unverified: []
			};
		}

		// 5. 获取最新快照（可能在分析过程中已更新）
		const updatedSnapshot = await prisma.consensusSnapshot.findFirst({
			where: { topicId: id },
			orderBy: { snapshotAt: 'desc' }
		});

		// 6. 如果快照存在且有效，使用快照的共识度
		// 否则使用AI分析的结果（但共识度可能不准确）
		const snapshot = updatedSnapshot && updatedSnapshot.consensusScore !== null
			? {
				consensusScore: updatedSnapshot.consensusScore,
				divergenceScore: updatedSnapshot.divergenceScore,
				trend: (updatedSnapshot.consensusData as any)?.trend || 'stable',
				snapshotAt: updatedSnapshot.snapshotAt
			}
			: null;

		// 构建快照对象（确保包含snapshotAt）
		const snapshotData = snapshot ? {
			consensusScore: snapshot.consensusScore,
			divergenceScore: snapshot.divergenceScore,
			trend: snapshot.trend,
			snapshotAt: snapshot.snapshotAt instanceof Date 
				? snapshot.snapshotAt.toISOString() 
				: typeof snapshot.snapshotAt === 'string' 
					? snapshot.snapshotAt 
					: new Date().toISOString()
		} : null;

		return NextResponse.json({
			consensus: aiResult.consensus || [],
			unverified: aiResult.unverified || [],
			totalDocs: docs.length,
			qualityDocs: qualityDocs.length,
			snapshot: snapshotData
		}, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		console.error('[Consensus API] Error:', err);
		return NextResponse.json({ error: err.message || '分析失败' }, { 
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// POST: 触发共识追踪（异步）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		
		// 触发异步追踪
		const { enqueueTrackConsensus } = await import('@/lib/queue/jobs');
		await enqueueTrackConsensus(id);
		
		return NextResponse.json({ 
			message: '共识追踪已启动，请稍候查看结果' 
		}, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error: any) {
		console.error('[Consensus API] Error:', error);
		return NextResponse.json({ error: error.message || 'Failed to trigger tracking' }, { 
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

