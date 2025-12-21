import { prisma } from '@/lib/db/client';
import { getApiKeyFromConfig, type AiProvider } from './adapters';

// 缓存语义相似度结果（基于文本对的hash）
const similarityCache = new Map<string, { similarity: number; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时

/**
 * 计算两个文本的语义相似度（0-1）
 * 
 * 实现方案：
 * 1. 优先尝试使用embedding API（如果支持）
 * 2. 如果不支持，使用AI生成相似度评分
 */
export async function calculateSemanticSimilarity(
	text1: string,
	text2: string,
	provider?: AiProvider,
	apiKey?: string,
	apiEndpoint?: string
): Promise<number> {
	// 1. 检查缓存
	const cacheKey = getCacheKey(text1, text2);
	const cached = similarityCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.similarity;
	}

	// 2. 如果没有提供provider和apiKey，尝试从系统配置获取
	if (!provider || !apiKey) {
		const systemConfig = await prisma.systemAiConfig.findFirst({
			orderBy: { updatedAt: 'desc' }
		});
		if (systemConfig) {
			provider = (systemConfig.provider as AiProvider) || 'siliconflow';
			apiKey = getApiKeyFromConfig(systemConfig.encApiKey);
			apiEndpoint = systemConfig.apiEndpoint || undefined;
		} else {
			// 如果没有系统配置，使用AI评分方法
			return await calculateSimilarityByAI(text1, text2, provider, apiKey, apiEndpoint);
		}
	}

	// 3. 尝试使用embedding API
	try {
		const similarity = await calculateSimilarityByEmbedding(text1, text2, provider!, apiKey!, apiEndpoint);
		// 缓存结果
		similarityCache.set(cacheKey, { similarity, timestamp: Date.now() });
		return similarity;
	} catch (err) {
		console.warn(`[SemanticSimilarity] Embedding API failed, falling back to AI scoring:`, err);
		// 如果embedding失败，使用AI评分方法
		const similarity = await calculateSimilarityByAI(text1, text2, provider, apiKey, apiEndpoint);
		similarityCache.set(cacheKey, { similarity, timestamp: Date.now() });
		return similarity;
	}
}

/**
 * 使用embedding API计算相似度
 */
async function calculateSimilarityByEmbedding(
	text1: string,
	text2: string,
	provider: AiProvider,
	apiKey: string,
	apiEndpoint?: string
): Promise<number> {
	// 确定embedding模型
	const embeddingModel = getEmbeddingModel(provider);
	
	// 确定API端点
	let endpoint = apiEndpoint;
	if (!endpoint) {
		endpoint = provider === 'openai' 
			? 'https://api.openai.com/v1'
			: provider === 'siliconflow'
			? 'https://api.siliconflow.cn/v1'
			: 'https://dashscope.aliyuncs.com/api/v1';
	}
	
	if (!endpoint.endsWith('/v1') && !endpoint.endsWith('/v1/')) {
		endpoint = endpoint.replace(/\/$/, '') + '/v1';
	}

	// 调用embedding API
	const response = await fetch(`${endpoint}/embeddings`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey.trim()}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: embeddingModel,
			input: [text1, text2]
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Embedding API failed: ${response.status} - ${errorText}`);
	}

	const data = await response.json() as any;
	
	if (!data.data || data.data.length !== 2) {
		throw new Error('Invalid embedding response');
	}

	const embedding1 = data.data[0].embedding;
	const embedding2 = data.data[1].embedding;

	// 计算余弦相似度
	return cosineSimilarity(embedding1, embedding2);
}

/**
 * 使用AI生成相似度评分（备选方案）
 */
async function calculateSimilarityByAI(
	text1: string,
	text2: string,
	provider?: AiProvider,
	apiKey?: string,
	apiEndpoint?: string
): Promise<number> {
	// 如果没有provider，使用系统配置
	if (!provider || !apiKey) {
		const systemConfig = await prisma.systemAiConfig.findFirst({
			orderBy: { updatedAt: 'desc' }
		});
		if (systemConfig) {
			provider = (systemConfig.provider as AiProvider) || 'siliconflow';
			apiKey = getApiKeyFromConfig(systemConfig.encApiKey);
			apiEndpoint = systemConfig.apiEndpoint || undefined;
		} else {
			// 如果没有配置，返回默认值
			return 0.5;
		}
	}

	const prompt = `请评估以下两个观点的语义相似度，返回0-1之间的分数（1表示完全相同，0表示完全不同）：

观点1：${text1}

观点2：${text2}

请只返回一个0-1之间的数字，不要包含任何其他文字。例如：0.85`;

	// 确定API端点
	let endpoint = apiEndpoint;
	if (!endpoint) {
		endpoint = provider === 'openai' 
			? 'https://api.openai.com/v1'
			: provider === 'siliconflow'
			? 'https://api.siliconflow.cn/v1'
			: 'https://dashscope.aliyuncs.com/api/v1';
	}
	
	if (!endpoint.endsWith('/v1') && !endpoint.endsWith('/v1/')) {
		endpoint = endpoint.replace(/\/$/, '') + '/v1';
	}

	const response = await fetch(`${endpoint}/chat/completions`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey.trim()}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: (await prisma.systemAiConfig.findFirst({ orderBy: { updatedAt: 'desc' } }))?.model || 'deepseek-chat',
			messages: [
				{ role: 'user', content: prompt }
			],
			max_tokens: 10,
			temperature: 0.3
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`AI API failed: ${response.status} - ${errorText}`);
	}

	const data = await response.json() as any;
	const text = data.choices?.[0]?.message?.content || '0.5';
	
	// 提取数字
	const match = text.match(/0?\.\d+|1\.0|0|1/);
	if (match) {
		const score = parseFloat(match[0]);
		return Math.max(0, Math.min(1, score)); // 确保在0-1范围内
	}

	return 0.5; // 默认值
}

/**
 * 获取embedding模型名称
 */
function getEmbeddingModel(provider: AiProvider): string {
	switch (provider) {
		case 'openai':
			return 'text-embedding-3-small';
		case 'siliconflow':
			return 'BAAI/bge-large-zh-v1.5'; // 硅基流动常用的中文embedding模型
		case 'qwen':
			return 'text-embedding-v2'; // 通义千问的embedding模型
		default:
			return 'text-embedding-3-small';
	}
}

/**
 * 计算余弦相似度
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
	if (vec1.length !== vec2.length) {
		throw new Error('Vectors must have the same length');
	}

	let dotProduct = 0;
	let norm1 = 0;
	let norm2 = 0;

	for (let i = 0; i < vec1.length; i++) {
		dotProduct += vec1[i] * vec2[i];
		norm1 += vec1[i] * vec1[i];
		norm2 += vec2[i] * vec2[i];
	}

	const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
	if (denominator === 0) {
		return 0;
	}

	return dotProduct / denominator;
}

/**
 * 生成缓存键
 */
function getCacheKey(text1: string, text2: string): string {
	// 使用文本的hash作为缓存键（确保顺序无关）
	const sorted = [text1, text2].sort().join('|||');
	return Buffer.from(sorted).toString('base64').substring(0, 100);
}

/**
 * 批量计算语义相似度（优化性能）
 */
export async function calculateBatchSimilarity(
	textPairs: Array<{ text1: string; text2: string }>,
	provider?: AiProvider,
	apiKey?: string,
	apiEndpoint?: string
): Promise<number[]> {
	// 并行计算，但限制并发数
	const batchSize = 5;
	const results: number[] = [];

	for (let i = 0; i < textPairs.length; i += batchSize) {
		const batch = textPairs.slice(i, i + batchSize);
		const batchResults = await Promise.all(
			batch.map(pair => 
				calculateSemanticSimilarity(pair.text1, pair.text2, provider, apiKey, apiEndpoint)
			)
		);
		results.push(...batchResults);
	}

	return results;
}

