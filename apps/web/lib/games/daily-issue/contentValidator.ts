/**
 * 内容审核工具
 * 检查情绪词、标签词、选项平衡性、代价真实性
 */

// 情绪词列表（示例，实际应该更全面）
const EMOTION_WORDS = [
	'愤怒',
	'恐惧',
	'厌恶',
	'悲伤',
	'快乐',
	'惊讶',
	'可恨',
	'可恶',
	'可悲',
	'可耻',
	'令人发指',
	'触目惊心',
	'痛心疾首',
	'义愤填膺',
	'深恶痛绝'
];

// 标签词列表（政治立场标签）
const LABEL_WORDS = [
	'左',
	'右',
	'左派',
	'右派',
	'左翼',
	'右翼',
	'自由派',
	'保守派',
	'激进',
	'温和',
	'进步',
	'反动',
	'自由主义',
	'保守主义',
	'社会主义',
	'资本主义'
];

/**
 * 检查文本中是否包含情绪词
 */
export function checkEmotionWords(text: string): {
	hasEmotion: boolean;
	words: string[];
} {
	const foundWords: string[] = [];
	for (const word of EMOTION_WORDS) {
		if (text.includes(word)) {
			foundWords.push(word);
		}
	}
	return {
		hasEmotion: foundWords.length > 0,
		words: foundWords
	};
}

/**
 * 检查文本中是否包含标签词
 */
export function checkLabelWords(text: string): {
	hasLabel: boolean;
	words: string[];
} {
	const foundWords: string[] = [];
	for (const word of LABEL_WORDS) {
		if (text.includes(word)) {
			foundWords.push(word);
		}
	}
	return {
		hasLabel: foundWords.length > 0,
		words: foundWords
	};
}

/**
 * 检查选项平衡性
 * 确保所有选项都有合理性，没有明显的"陷阱选项"
 */
export function checkOptionBalance(options: string[]): {
	isBalanced: boolean;
	issues: string[];
} {
	const issues: string[] = [];

	if (options.length < 2) {
		issues.push('选项数量不足，至少需要2个选项');
	}

	// 检查选项长度是否差异过大（可能暗示某个选项是陷阱）
	const lengths = options.map((opt) => opt.length);
	const maxLength = Math.max(...lengths);
	const minLength = Math.min(...lengths);
	if (maxLength / minLength > 3) {
		issues.push('选项长度差异过大，可能影响用户选择');
	}

	// 检查是否有明显的否定词（可能暗示错误选项）
	const negativeWords = ['不', '非', '无', '没有', '错误', '错误地'];
	for (const option of options) {
		if (negativeWords.some((word) => option.startsWith(word))) {
			issues.push(`选项"${option}"以否定词开头，可能暗示错误`);
		}
	}

	return {
		isBalanced: issues.length === 0,
		issues
	};
}

/**
 * 检查代价描述是否真实
 * 代价不应该包含虚假的道德惩罚或过于极端的后果
 */
export function checkCostReality(costDescription: string): {
	isRealistic: boolean;
	issues: string[];
} {
	const issues: string[] = [];

	// 检查是否包含过于极端的词汇
	const extremeWords = ['完全', '彻底', '永远', '绝对', '必然'];
	for (const word of extremeWords) {
		if (costDescription.includes(word)) {
			issues.push(`代价描述包含极端词汇"${word}"，可能不够真实`);
		}
	}

	// 检查是否包含道德判断词汇
	const moralWords = ['邪恶', '不道德', '可耻', '罪恶'];
	for (const word of moralWords) {
		if (costDescription.includes(word)) {
			issues.push(`代价描述包含道德判断词汇"${word}"，应该描述事实而非道德`);
		}
	}

	return {
		isRealistic: issues.length === 0,
		issues
	};
}

/**
 * 综合验证议题内容
 */
export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export function validateIssueContent(data: {
	caseDescription: string;
	nodes: Array<{
		title?: string;
		content?: string;
		stage?: number;
		nextNodeKeys?: string[];
	}>;
}): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// 检查案例描述（确保是字符串）
	const caseDescription = data.caseDescription || '';
	if (caseDescription) {
		const caseEmotion = checkEmotionWords(caseDescription);
		if (caseEmotion.hasEmotion) {
			errors.push(
				`案例描述包含情绪词: ${caseEmotion.words.join(', ')}`
			);
		}

		const caseLabel = checkLabelWords(caseDescription);
		if (caseLabel.hasLabel) {
			errors.push(`案例描述包含标签词: ${caseLabel.words.join(', ')}`);
		}
	}

	// 检查所有节点
	for (const node of data.nodes) {
		// 确保 title 和 content 都是字符串
		const title = node.title || '';
		const content = node.content || '';
		
		// 检查标题
		if (title) {
			const titleEmotion = checkEmotionWords(title);
			if (titleEmotion.hasEmotion) {
				warnings.push(
					`节点"${title}"的标题包含情绪词: ${titleEmotion.words.join(', ')}`
				);
			}

			const titleLabel = checkLabelWords(title);
			if (titleLabel.hasLabel) {
				errors.push(
					`节点"${title}"的标题包含标签词: ${titleLabel.words.join(', ')}`
				);
			}
		}

		// 检查内容
		if (content) {
			const contentEmotion = checkEmotionWords(content);
			if (contentEmotion.hasEmotion) {
				warnings.push(
					`节点"${title || '未知'}"的内容包含情绪词: ${contentEmotion.words.join(', ')}`
				);
			}

			const contentLabel = checkLabelWords(content);
			if (contentLabel.hasLabel) {
				errors.push(
					`节点"${title || '未知'}"的内容包含标签词: ${contentLabel.words.join(', ')}`
				);
			}
		}

		// 如果是阶段3或4，检查选项平衡性和代价真实性
		if (node.stage === 3 || node.stage === 4) {
			// 获取选项内容（需要从nextNodeKeys对应的节点获取）
			// 这里简化处理，只检查当前节点的内容
			if (node.stage === 4 && content) {
				const costCheck = checkCostReality(content);
				if (!costCheck.isRealistic) {
					warnings.push(
						`阶段4节点"${title || '未知'}"的代价描述: ${costCheck.issues.join('; ')}`
					);
				}
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

