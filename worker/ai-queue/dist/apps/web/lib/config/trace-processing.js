/**
 * 溯源处理配置
 * 可以通过环境变量覆盖
 */
export const TRACE_PROCESSING_CONFIG = {
    // 内容限制
    CONTENT_LIMITS: {
        BODY_MIN_LENGTH: parseInt(process.env.TRACE_BODY_MIN_LENGTH || '100', 10),
        BODY_MAX_LENGTH: parseInt(process.env.TRACE_BODY_MAX_LENGTH || '50000', 10),
        CITATIONS_MAX_COUNT: parseInt(process.env.TRACE_CITATIONS_MAX || '100', 10),
        CITATION_TITLE_MAX: parseInt(process.env.CITATION_TITLE_MAX || '500', 10),
        CITATION_QUOTE_MAX: parseInt(process.env.CITATION_QUOTE_MAX || '2000', 10)
    },
    // AI分析配置
    AI_ANALYSIS: {
        TIMEOUT_MS: parseInt(process.env.TRACE_ANALYSIS_TIMEOUT || '300000', 10), // 5分钟
        CREDIBILITY_THRESHOLD: parseFloat(process.env.TRACE_CREDIBILITY_THRESHOLD || '0.7', 10),
        RETRY_ATTEMPTS: parseInt(process.env.TRACE_ANALYSIS_RETRIES || '2', 10),
        MAX_CONCURRENT: parseInt(process.env.TRACE_ANALYSIS_CONCURRENT || '3', 10) // 最多3个同时分析
    },
    // 发布限流
    RATE_LIMITS: {
        PUBLISH_PER_HOUR: parseInt(process.env.TRACE_PUBLISH_LIMIT || '10', 10),
        CREATE_PER_HOUR: parseInt(process.env.TRACE_CREATE_LIMIT || '20', 10)
    },
    // 缓存配置
    CACHE: {
        ENTRY_TTL: parseInt(process.env.ENTRY_CACHE_TTL || '3600', 10), // 词条缓存1小时
        TRACE_TTL: parseInt(process.env.TRACE_CACHE_TTL || '600', 10), // 溯源缓存10分钟
        ANALYSIS_CACHE_TTL: parseInt(process.env.ANALYSIS_CACHE_TTL || '86400', 10) // 分析结果缓存24小时
    }
};
