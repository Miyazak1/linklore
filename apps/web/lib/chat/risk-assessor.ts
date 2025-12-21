/**
 * 内容风险等级评估模块
 * 用于评估用户输入的风险等级（0-4），并根据等级决定 AI 响应策略
 */

export type RiskLevel = 0 | 1 | 2 | 3 | 4;

export interface RiskAssessment {
	riskLevel: RiskLevel;
	tags: {
		pointingToRealPeople: boolean; // 是否指向现实人物
		pointingToRealOrganizations: boolean; // 是否指向现实组织
		pointingToRealEvents: boolean; // 是否指向现实事件
		actionOriented: boolean; // 是否包含行动号召
		emotionalIntensity: number; // 情绪强度 0-1
		valueJudgmentIntensity: number; // 价值判断强度 0-1
		timeliness: number; // 时政时效性 0-1
		narrativeType: 'ethnic' | 'class' | 'historical' | 'none'; // 叙事类型
	};
	reasoning: string; // 评估理由
}

// 敏感词表（示例，实际应从配置文件或数据库加载）
const SENSITIVE_WORDS = {
	level1: ['中央集权', '资本主义', '社会主义', '民主', '自由', '平等', '革命'],
	level2: ['政府', '政策', '制度', '体制', '国家', '中国', '美国'],
	level3: ['腐败', '专制', '独裁', '暴政', '推翻', '斗争', '集会', '组织'],
	level4: ['推翻政府', '组织行动', '暴力', '恐怖', '煽动']
};

// 情绪词表
const EMOTIONAL_WORDS = {
	negative: ['垃圾', '烂', '黑', '反', '恨', '愤怒', '恶心', '讨厌', '卑鄙', '无耻'],
	strong: ['必须', '应该', '一定', '绝对', '完全', '彻底', '永远']
};

// 行动导向词
const ACTION_WORDS = ['组织', '行动', '号召', '动员', '推翻', '反对', '抵制', '抗议'];

/**
 * 评估内容风险等级
 */
export async function assessRisk(
	userInput: string,
	context?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<RiskAssessment> {
	const input = userInput.toLowerCase();
	const contextText = context?.map(c => c.content).join(' ') || '';
	const fullText = (input + ' ' + contextText).toLowerCase();

	// 初始化标签
	const tags = {
		pointingToRealPeople: false,
		pointingToRealOrganizations: false,
		pointingToRealEvents: false,
		actionOriented: false,
		emotionalIntensity: 0,
		valueJudgmentIntensity: 0,
		timeliness: 0,
		narrativeType: 'none' as const
	};

	const reasoning: string[] = [];

	// 检测指向性
	if (detectRealPeople(fullText)) {
		tags.pointingToRealPeople = true;
		reasoning.push('检测到可能指向现实人物');
	}

	if (detectRealOrganizations(fullText)) {
		tags.pointingToRealOrganizations = true;
		reasoning.push('检测到可能指向现实组织');
	}

	if (detectRealEvents(fullText)) {
		tags.pointingToRealEvents = true;
		reasoning.push('检测到可能指向现实事件');
	}

	// 检测行动导向
	const actionWordsFound = ACTION_WORDS.filter(word => fullText.includes(word));
	if (actionWordsFound.length > 0) {
		tags.actionOriented = true;
		reasoning.push(`检测到行动导向词汇: ${actionWordsFound.join(', ')}`);
	}

	// 检测情绪强度
	const negativeWords = EMOTIONAL_WORDS.negative.filter(word => fullText.includes(word));
	tags.emotionalIntensity = Math.min(negativeWords.length * 0.2, 1);
	if (negativeWords.length > 0) {
		reasoning.push(`检测到负面情绪词汇: ${negativeWords.slice(0, 3).join(', ')}`);
	}

	// 检测价值判断强度
	const strongWords = EMOTIONAL_WORDS.strong.filter(word => fullText.includes(word));
	tags.valueJudgmentIntensity = Math.min(strongWords.length * 0.25, 1);
	if (strongWords.length > 0) {
		reasoning.push(`检测到强烈价值判断词汇: ${strongWords.slice(0, 3).join(', ')}`);
	}

	// 检测时政时效性（简单启发式：包含当前年份、近期事件关键词）
	const currentYear = new Date().getFullYear();
	if (fullText.includes(currentYear.toString()) || detectRecentEvents(fullText)) {
		tags.timeliness = 0.7;
		reasoning.push('检测到可能涉及时政内容');
	}

	// 检测叙事类型
	if (detectEthnicNarrative(fullText)) {
		tags.narrativeType = 'ethnic';
		reasoning.push('检测到民族叙事框架');
	} else if (detectClassNarrative(fullText)) {
		tags.narrativeType = 'class';
		reasoning.push('检测到阶级叙事框架');
	} else if (detectHistoricalNarrative(fullText)) {
		tags.narrativeType = 'historical';
	}

	// 计算风险等级
	let riskLevel: RiskLevel = 0;

	// Level 4: 违法、行动号召、组织动员
	if (tags.actionOriented && (tags.pointingToRealPeople || tags.pointingToRealOrganizations)) {
		if (SENSITIVE_WORDS.level4.some(word => fullText.includes(word))) {
			riskLevel = 4;
			reasoning.push('Level 4: 检测到违法行动号召');
		}
	}

	// Level 3: 高风险（现实人物、机构攻击、强情绪判断）
	if (riskLevel === 0) {
		if (
			(tags.pointingToRealPeople || tags.pointingToRealOrganizations) &&
			(tags.emotionalIntensity > 0.6 || tags.valueJudgmentIntensity > 0.7)
		) {
			riskLevel = 3;
			reasoning.push('Level 3: 检测到高风险内容（现实指向 + 强烈情绪/判断）');
		} else if (SENSITIVE_WORDS.level3.some(word => fullText.includes(word))) {
			riskLevel = 3;
			reasoning.push('Level 3: 检测到高风险敏感词');
		}
	}

	// Level 2: 中度风险（现实政治结构、制度评价）
	if (riskLevel === 0) {
		if (
			(tags.pointingToRealOrganizations || tags.timeliness > 0.5) &&
			(tags.valueJudgmentIntensity > 0.4 || SENSITIVE_WORDS.level2.some(word => fullText.includes(word)))
		) {
			riskLevel = 2;
			reasoning.push('Level 2: 检测到中度风险（现实制度/政策评价）');
		}
	}

	// Level 1: 轻微风险（敏感词出现但无指向行为）
	if (riskLevel === 0) {
		if (SENSITIVE_WORDS.level1.some(word => fullText.includes(word))) {
			riskLevel = 1;
			reasoning.push('Level 1: 检测到轻微敏感词');
		}
	}

	return {
		riskLevel,
		tags,
		reasoning: reasoning.length > 0 ? reasoning.join('; ') : '正常讨论内容'
	};
}

/**
 * 检测是否指向现实人物
 */
function detectRealPeople(text: string): boolean {
	// 简单启发式：检测常见政治人物姓名、职位等
	// 实际应用中应使用更复杂的 NLP 或实体识别
	const patterns = [
		/\b(主席|总理|总统|总书记|领导人|领导)\b/,
		/\b[某][位|名|个]\s*(领导|官员|人物)\b/
	];
	return patterns.some(pattern => pattern.test(text));
}

/**
 * 检测是否指向现实组织
 */
function detectRealOrganizations(text: string): boolean {
	const patterns = [
		/\b(政府|党中央|国务院|中央|部委|省委|市委|县委)\b/,
		/\b(共产党|国民党|民主党)\b/
	];
	return patterns.some(pattern => pattern.test(text));
}

/**
 * 检测是否指向现实事件
 */
function detectRealEvents(text: string): boolean {
	// 检测年份、具体事件关键词
	const patterns = [
		/\b(20\d{2}|19\d{2})\s*年\b/, // 年份
		/\b(事件|事故|案件|运动|革命|改革)\b/
	];
	return patterns.some(pattern => pattern.test(text));
}

/**
 * 检测近期事件
 */
function detectRecentEvents(text: string): boolean {
	// 检测可能表示近期事件的词汇
	const recentKeywords = ['最近', '近期', '现在', '当前', '目前', '刚刚', '最近发生'];
	return recentKeywords.some(keyword => text.includes(keyword));
}

/**
 * 检测民族叙事
 */
function detectEthnicNarrative(text: string): boolean {
	const keywords = ['民族', '种族', '文化冲突', '民族矛盾'];
	return keywords.some(keyword => text.includes(keyword));
}

/**
 * 检测阶级叙事
 */
function detectClassNarrative(text: string): boolean {
	const keywords = ['阶级', '阶层', '无产阶级', '资产阶级', '剥削', '压迫'];
	return keywords.some(keyword => text.includes(keyword));
}

/**
 * 检测历史叙事
 */
function detectHistoricalNarrative(text: string): boolean {
	const keywords = ['历史', '过去', '曾经', '历史上', '古代', '近代'];
	return keywords.some(keyword => text.includes(keyword));
}









