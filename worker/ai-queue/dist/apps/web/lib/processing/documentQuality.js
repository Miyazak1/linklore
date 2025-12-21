// 关键维度（用于判断是否能提炼有效观点）
const CRITICAL_DIMENSIONS = {
    default: ['观点', '逻辑', '证据'],
    '哲学': ['观点', '逻辑', '论证'],
    '文学': ['观点', '表达', '材料'],
    '历史': ['观点', '逻辑', '史料'],
    '科学': ['观点', '逻辑', '数据']
};
import { AI_PROCESSING_CONFIG } from '@/lib/config/ai-processing';
// 质量阈值（从配置读取）
const QUALITY_THRESHOLDS = {
    overall: AI_PROCESSING_CONFIG.QUALITY_THRESHOLDS.OVERALL,
    critical: AI_PROCESSING_CONFIG.QUALITY_THRESHOLDS.CRITICAL,
    viewpoint: AI_PROCESSING_CONFIG.QUALITY_THRESHOLDS.VIEWPOINT
};
/**
 * 计算加权平均分
 */
function calculateWeightedScore(scores, discipline = 'default') {
    const RUBRICS = {
        default: { '结构': 0.2, '逻辑': 0.25, '观点': 0.25, '证据': 0.2, '引用': 0.1 },
        '哲学': { '结构': 0.15, '逻辑': 0.3, '观点': 0.3, '论证': 0.15, '引用': 0.1 },
        '文学': { '结构': 0.2, '表达': 0.3, '观点': 0.25, '材料': 0.15, '引用': 0.1 },
        '历史': { '结构': 0.15, '逻辑': 0.2, '观点': 0.25, '史料': 0.3, '引用': 0.1 },
        '科学': { '结构': 0.15, '逻辑': 0.25, '观点': 0.2, '数据': 0.3, '引用': 0.1 }
    };
    const weights = RUBRICS[discipline] || RUBRICS.default;
    let weightedSum = 0;
    let totalWeight = 0;
    Object.entries(scores).forEach(([key, value]) => {
        if (key === '_reasoning')
            return; // 跳过推理字段
        const weight = weights[key] || 0;
        const score = typeof value === 'number' ? value : 0;
        weightedSum += score * weight;
        totalWeight += weight;
    });
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
/**
 * 检查文档质量是否足够参与分歧分析
 */
export function checkDocumentQuality(evaluation, discipline = 'default') {
    const scores = evaluation.scores || {};
    const overallScore = calculateWeightedScore(scores, discipline);
    // 获取关键维度
    const criticalDims = CRITICAL_DIMENSIONS[discipline] || CRITICAL_DIMENSIONS.default;
    const criticalScores = criticalDims
        .map(dim => scores[dim] || 0)
        .filter(score => score > 0);
    const criticalScore = criticalScores.length > 0
        ? criticalScores.reduce((a, b) => a + b, 0) / criticalScores.length
        : 0;
    const reasons = [];
    const suggestions = [];
    // 判断条件
    if (overallScore < QUALITY_THRESHOLDS.overall) {
        reasons.push(`整体评分有提升空间（当前 ${overallScore.toFixed(1)}/10）`);
        suggestions.push('提升文档整体质量，让观点表达更清晰、论证更充分');
    }
    if (criticalScore < QUALITY_THRESHOLDS.critical) {
        reasons.push(`关键维度（${criticalDims.join('、')}）平均分有提升空间（当前 ${criticalScore.toFixed(1)}/10）`);
        suggestions.push('加强观点表达、逻辑论证和证据支持');
    }
    const viewpoint = scores['观点'] || 0;
    if (viewpoint < QUALITY_THRESHOLDS.viewpoint) {
        reasons.push(`观点维度需要加强（当前 ${viewpoint.toFixed(1)}/10），难以提炼有效观点`);
        suggestions.push('明确表达核心观点，提供清晰的论述');
    }
    // 检查是否至少有一个维度达到基本要求
    const hasBasicQuality = Object.entries(scores).some(([key, value]) => {
        if (key === '_reasoning')
            return false;
        return typeof value === 'number' && value >= 4;
    });
    if (!hasBasicQuality && Object.keys(scores).length > 0) {
        reasons.push('各维度评分均未达到基本要求（4分以上）');
        suggestions.push('全面提升文档质量，至少在一个维度达到基本要求');
    }
    const isSufficient = reasons.length === 0;
    return {
        isSufficient,
        overallScore,
        criticalScore,
        reasons,
        suggestions
    };
}
