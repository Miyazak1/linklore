/**
 * AI处理配置
 * 可以通过环境变量覆盖
 */

export const AI_PROCESSING_CONFIG = {
	// 文本长度限制（字符数）
	TEXT_LIMITS: {
		SUMMARIZE: parseInt(process.env.AI_SUMMARIZE_TEXT_LIMIT || '10000', 10),
		EVALUATE: parseInt(process.env.AI_EVALUATE_TEXT_LIMIT || '8000', 10),
		ANALYZE: parseInt(process.env.AI_ANALYZE_TEXT_LIMIT || '15000', 10)
	},
	
	// 质量阈值
	QUALITY_THRESHOLDS: {
		OVERALL: parseFloat(process.env.MIN_QUALITY_SCORE || '4.0'),
		CRITICAL: parseFloat(process.env.MIN_CRITICAL_SCORE || '3.0'),
		VIEWPOINT: parseFloat(process.env.MIN_VIEWPOINT_SCORE || '2.0')
	},
	
	// 批量处理大小
	BATCH_SIZES: {
		DISAGREEMENT_ANALYSIS: parseInt(process.env.DISAGREEMENT_BATCH_SIZE || '10', 10)
	},
	
	// 重试配置
	RETRY: {
		ATTEMPTS: parseInt(process.env.AI_RETRY_ATTEMPTS || '3', 10),
		BACKOFF_DELAY: parseInt(process.env.AI_RETRY_BACKOFF_DELAY || '2000', 10)
	}
};



