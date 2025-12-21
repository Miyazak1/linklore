/**
 * AI 输出过滤器
 * 用于二次检查 AI 返回内容，防止模型在高风险场景下输出违规内容
 */

import { assessRisk, type RiskAssessment } from './risk-assessor';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('Output Filter');

/**
 * 过滤 AI 输出，检查是否包含敏感内容
 */
export async function filterAiOutput(
	output: string,
	originalRiskLevel: number,
	roomType: 'SOLO' | 'DUO' = 'SOLO'
): Promise<{
	passed: boolean;
	filteredOutput?: string;
	needsRetry: boolean;
	shouldRefuse: boolean;
}> {
	// 如果原始风险等级已经是 Level 4，直接拒答
	if (originalRiskLevel === 4) {
		return {
			passed: false,
			shouldRefuse: true,
			needsRetry: false
		};
	}

	// 对输出内容进行风险评估
	const outputRisk = await assessRisk(output);

	// 如果输出风险等级比输入更高，说明模型可能失控
	if (outputRisk.riskLevel > originalRiskLevel) {
		log.warn('输出风险等级高于输入风险等级', {
			outputRiskLevel: outputRisk.riskLevel,
			originalRiskLevel
		});

		// Level 4: 直接拒答
		if (outputRisk.riskLevel === 4) {
			return {
				passed: false,
				shouldRefuse: true,
				needsRetry: false
			};
		}

		// Level 3: 尝试重试（附加更严格 Prompt）
		if (outputRisk.riskLevel === 3) {
			return {
				passed: false,
				needsRetry: true,
				shouldRefuse: false
			};
		}

		// Level 2: 可以接受，但可能需要警告
		return {
			passed: true,
			filteredOutput: output,
			needsRetry: false,
			shouldRefuse: false
		};
	}

	// 检查是否包含明显违规内容
	if (containsViolations(output)) {
		return {
			passed: false,
			shouldRefuse: true,
			needsRetry: false
		};
	}

	// 检查是否包含极端政治判断
	if (containsExtremeJudgments(output)) {
		return {
			passed: false,
			needsRetry: true,
			shouldRefuse: false
		};
	}

	// 检查是否包含行动号召
	if (containsActionCalls(output)) {
		return {
			passed: false,
			shouldRefuse: true,
			needsRetry: false
		};
	}

	// 通过检查
	return {
		passed: true,
		filteredOutput: output,
		needsRetry: false,
		shouldRefuse: false
	};
}

/**
 * 检查是否包含明显违规内容
 */
function containsViolations(text: string): boolean {
	const violationPatterns = [
		/推翻.*?政府/i,
		/组织.*?行动/i,
		/煽动.*?暴力/i,
		/号召.*?集会/i,
		/非法.*?活动/i
	];

	return violationPatterns.some(pattern => pattern.test(text));
}

/**
 * 检查是否包含极端政治判断
 */
function containsExtremeJudgments(text: string): boolean {
	const judgmentPatterns = [
		/完全.*?错误/i,
		/必须.*?推翻/i,
		/彻底.*?失败/i,
		/绝对.*?正确/i,
		/永远.*?不可能/i
	];

	return judgmentPatterns.some(pattern => pattern.test(text));
}

/**
 * 检查是否包含行动号召
 */
function containsActionCalls(text: string): boolean {
	const actionPatterns = [
		/我们应该.*?行动/i,
		/必须.*?组织/i,
		/号召.*?参与/i,
		/动员.*?力量/i
	];

	return actionPatterns.some(pattern => pattern.test(text));
}

/**
 * 获取拒答模板
 */
export function getRefuseAndRedirectTemplate(): string {
	return `这个问题涉及现实行动建议，我无法提供。但我们可以从以下角度讨论你关注的问题本质：

1. 马克思主义哲学：从实践、矛盾、发展等角度分析
2. 社会结构：从制度、权力、资源分配等角度分析
3. 公共管理理论：从治理、组织、决策等角度分析

你希望从哪个角度展开讨论？`;
}

