import { prisma } from '@/lib/db/client';
import { routeAiCall } from '@/lib/ai/router';
import { checkDocumentQuality } from './documentQuality';
import { getDocumentTree } from '@/lib/topics/documentTree';
import { getDocumentPath } from '@/lib/topics/documentTree';
import crypto from 'crypto';

export interface DisagreementData {
	title: string;
	description?: string;
	docIds: string[];
	doc1Id?: string;
	doc2Id?: string;
	claim1?: string;
	claim2?: string;
	severity?: 'high' | 'medium' | 'low';
	confidence?: number;
	branchPath?: string[];
}

// 分析锁（防止并发分析）
const analysisLocks = new Map<string, Promise<any>>();

// Debounce 缓存（5分钟内只分析一次）
const analysisCache = new Map<string, { timestamp: number; result: any }>();
const DEBOUNCE_MS = 5 * 60 * 1000; // 5分钟

/**
 * 增量分析分歧（只分析新文档与已有文档的分歧）
 */
export async function analyzeDisagreementsIncremental(
	topicId: string,
	newDocumentId?: string
): Promise<DisagreementData[]> {
	// 检查缓存
	const cacheKey = `topic:${topicId}:${newDocumentId || 'all'}`;
	const cached = analysisCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < DEBOUNCE_MS) {
		console.log(`[AnalyzeDisagreements] Using cached result for ${cacheKey}`);
		return cached.result;
	}

	// 检查分析锁
	if (analysisLocks.has(cacheKey)) {
		console.log(`[AnalyzeDisagreements] Analysis already in progress for ${cacheKey}, waiting...`);
		return await analysisLocks.get(cacheKey)!;
	}

	// 创建分析任务
	const analysisPromise = performAnalysis(topicId, newDocumentId);
	analysisLocks.set(cacheKey, analysisPromise);

	try {
		const result = await analysisPromise;
		// 更新缓存
		analysisCache.set(cacheKey, { timestamp: Date.now(), result });
		return result;
	} finally {
		analysisLocks.delete(cacheKey);
	}
}

async function performAnalysis(
	topicId: string,
	newDocumentId?: string
): Promise<DisagreementData[]> {
	console.log(`[AnalyzeDisagreements] Starting analysis for topic ${topicId}, newDoc: ${newDocumentId || 'all'}`);

	// 获取文档树 (不加载extractedText以提升性能)
	const docTree = await getDocumentTree(topicId, false);
	
	// 获取所有文档的详细信息（包括评价）
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
			evaluations: { orderBy: { createdAt: 'desc' }, take: 1 },
			summaries: { orderBy: { id: 'desc' }, take: 1 },
			topic: { select: { discipline: true } }
		}
	});

	// 过滤低质量文档
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

	console.log(`[AnalyzeDisagreements] Total docs: ${docs.length}, Quality docs: ${qualityDocs.length}`);

	if (qualityDocs.length < 2) {
		console.log(`[AnalyzeDisagreements] Not enough quality documents for analysis`);
		return [];
	}

	// 如果是增量分析，只分析新文档与已有文档的分歧
	let docPairs: Array<[typeof qualityDocs[0], typeof qualityDocs[0]]> = [];
	if (newDocumentId) {
		const newDoc = qualityDocs.find(d => d.id === newDocumentId);
		if (!newDoc) {
			console.log(`[AnalyzeDisagreements] New document ${newDocumentId} not found or quality insufficient`);
			return [];
		}
		// 新文档与所有其他文档比较
		qualityDocs.forEach(doc => {
			if (doc.id !== newDocumentId) {
				docPairs.push([newDoc, doc]);
			}
		});
	} else {
		// 全量分析：所有文档两两比较
		for (let i = 0; i < qualityDocs.length; i++) {
			for (let j = i + 1; j < qualityDocs.length; j++) {
				docPairs.push([qualityDocs[i], qualityDocs[j]]);
			}
		}
	}

	console.log(`[AnalyzeDisagreements] Analyzing ${docPairs.length} document pairs`);

	// 批量分析（每次分析最多10对）
	const batchSize = 10;
	const allDisagreements: DisagreementData[] = [];

	for (let i = 0; i < docPairs.length; i += batchSize) {
		const batch = docPairs.slice(i, i + batchSize);
		const batchResults = await Promise.all(
			batch.map(([doc1, doc2]) => analyzePair(doc1, doc2, topicId))
		);
		allDisagreements.push(...batchResults.filter(d => d !== null) as DisagreementData[]);
	}

	// 去重
	const deduplicated = deduplicateDisagreements(allDisagreements);

	// 保存到数据库
	await saveDisagreements(topicId, deduplicated);

	return deduplicated;
}

async function analyzePair(
	doc1: any,
	doc2: any,
	topicId: string
): Promise<DisagreementData | null> {
	const summary1 = doc1.summaries[0];
	const summary2 = doc2.summaries[0];

	if (!summary1 || !summary2) {
		return null; // 没有总结的文档不分析
	}

	const claims1 = Array.isArray(summary1.claims) ? summary1.claims.filter((c: any): c is string => typeof c === 'string') : [];
	const claims2 = Array.isArray(summary2.claims) ? summary2.claims.filter((c: any): c is string => typeof c === 'string') : [];

	if (claims1.length === 0 || claims2.length === 0) {
		return null; // 没有观点的文档不分析
	}

	// 构建分析提示
	const prompt = `请分析以下两个文档的观点分歧：

文档1（ID: ${doc1.id}）：
标题：${summary1.title}
概述：${summary1.overview}
观点：${claims1.join('；')}

文档2（ID: ${doc2.id}）：
标题：${summary2.title}
概述：${summary2.overview}
观点：${claims2.join('；')}

请识别这两个文档之间的主要分歧点，用JSON格式返回：
{
  "disagreements": [
    {
      "title": "分歧标题（简洁描述分歧点）",
      "description": "详细描述分歧内容",
      "claim1": "文档1的观点",
      "claim2": "文档2的观点",
      "severity": "high|medium|low",
      "confidence": 0.0-1.0
    }
  ]
}

如果没有明显分歧，返回空数组。`;

	try {
		const result = await routeAiCall({
			userId: doc1.authorId, // 使用文档1的作者ID
			task: 'analyze',
			estimatedMaxCostCents: 30,
			prompt
		});

		// 解析AI响应
		const jsonMatch = result.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			return null;
		}

		const data = JSON.parse(jsonMatch[0]);
		if (!data.disagreements || !Array.isArray(data.disagreements) || data.disagreements.length === 0) {
			return null;
		}

		// 获取分支路径
		const path1 = await getDocumentPath(doc1.id);
		const path2 = await getDocumentPath(doc2.id);
		const branchPath = [...new Set([...path1, ...path2])]; // 合并路径并去重

		// 转换为 DisagreementData
		const disagreement = data.disagreements[0]; // 取第一个分歧点
		return {
			title: disagreement.title || '观点分歧',
			description: disagreement.description,
			docIds: [doc1.id, doc2.id],
			doc1Id: doc1.id,
			doc2Id: doc2.id,
			claim1: disagreement.claim1,
			claim2: disagreement.claim2,
			severity: disagreement.severity || 'medium',
			confidence: disagreement.confidence || 0.5,
			branchPath
		};
	} catch (error: any) {
		console.error(`[AnalyzeDisagreements] Failed to analyze pair (${doc1.id}, ${doc2.id}):`, error);
		return null;
	}
}

/**
 * 去重分歧点
 */
function deduplicateDisagreements(disagreements: DisagreementData[]): DisagreementData[] {
	const seen = new Set<string>();
	const result: DisagreementData[] = [];

	for (const d of disagreements) {
		// 生成唯一标识（基于文档ID对和标题）
		const key = `${d.doc1Id || ''}-${d.doc2Id || ''}-${d.title}`;
		const hash = crypto.createHash('md5').update(key).digest('hex');
		
		if (!seen.has(hash)) {
			seen.add(hash);
			result.push(d);
		}
	}

	return result;
}

/**
 * 保存分歧点到数据库
 */
async function saveDisagreements(topicId: string, disagreements: DisagreementData[]) {
	// 获取现有分歧点
	const existing = await prisma.disagreement.findMany({
		where: { topicId },
		select: { id: true, doc1Id: true, doc2Id: true, title: true }
	});

	// 生成现有分歧点的hash
	const existingHashes = new Set(
		existing.map(d => {
			const key = `${d.doc1Id || ''}-${d.doc2Id || ''}-${d.title}`;
			return crypto.createHash('md5').update(key).digest('hex');
		})
	);

	// 只保存新的分歧点
	for (const d of disagreements) {
		const key = `${d.doc1Id || ''}-${d.doc2Id || ''}-${d.title}`;
		const hash = crypto.createHash('md5').update(key).digest('hex');
		
		if (!existingHashes.has(hash)) {
			await prisma.disagreement.create({
				data: {
					topicId,
					title: d.title,
					description: d.description || null,
					docIds: d.docIds,
					doc1Id: d.doc1Id || null,
					doc2Id: d.doc2Id || null,
					claim1: d.claim1 || null,
					claim2: d.claim2 || null,
					severity: d.severity || null,
					confidence: d.confidence || null,
					branchPath: d.branchPath || [],
					aiGenerated: true,
					verified: false
				}
			});
		}
	}
}

/**
 * 验证分歧点是否仍然有效（文档是否还存在且质量足够）
 */
export async function validateDisagreements(topicId: string): Promise<void> {
	const disagreements = await prisma.disagreement.findMany({
		where: { topicId, aiGenerated: true }
	});

	for (const d of disagreements) {
		// 检查涉及的文档是否还存在
		const docs = await prisma.document.findMany({
			where: { id: { in: d.docIds } },
			include: {
				evaluations: { orderBy: { createdAt: 'desc' }, take: 1 },
				topic: { select: { discipline: true } }
			}
		});

		// 如果文档不存在或质量不足，标记为无效
		const allValid = docs.every(doc => {
			if (!doc.evaluations || doc.evaluations.length === 0) return false;
			const qualityCheck = checkDocumentQuality(
				doc.evaluations[0],
				doc.topic?.discipline || undefined
			);
			return qualityCheck.isSufficient;
		});

		if (!allValid) {
			await prisma.disagreement.update({
				where: { id: d.id },
				data: { status: 'invalid' }
			});
		}
	}
}








