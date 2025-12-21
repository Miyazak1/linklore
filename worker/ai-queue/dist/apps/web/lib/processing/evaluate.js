import { prisma } from '@/lib/db/client';
import { routeAiCall } from '@/lib/ai/router';
import { updateProcessingStatus, checkProcessingDependencies } from './status';
import { AI_PROCESSING_CONFIG } from '@/lib/config/ai-processing';
/**
 * 检测文档中是否存在引用
 * 检测模式包括：
 * - 参考文献列表（参考文献、References、Bibliography等）
 * - 文中引用标记（[1], (Smith, 2020), 等）
 * - 脚注标记（¹, ², ³, [1], [2]等）
 * - 引用格式（作者名+年份、DOI、ISBN等）
 */
function hasCitations(text) {
    // 检测参考文献列表标题
    const referenceSectionPatterns = [
        /参考文献/,
        /references?/i,
        /bibliography/i,
        /works?\s*cited/i,
        /引用文献/,
        /参考书目/
    ];
    const hasReferenceSection = referenceSectionPatterns.some(pattern => pattern.test(text));
    if (hasReferenceSection) {
        // 如果找到参考文献标题，检查后面是否有内容
        const refMatch = text.match(/(?:参考文献|references?|bibliography|works?\s*cited|引用文献|参考书目)[:：]?\s*\n([\s\S]{50,})/i);
        if (refMatch && refMatch[1].trim().length > 20) {
            return true;
        }
    }
    // 检测文中引用标记：方括号数字 [1], [2-5], [1,2,3]
    const inTextCitationPatterns = [
        /\[\d+\]/g, // [1], [2]
        /\[\d+[-\s,]\d+\]/g, // [1-5], [1,2,3]
        /\(\d{4}[a-z]?\)/g, // (2020), (2020a)
        /\([A-Z][a-z]+\s*,\s*\d{4}\)/g, // (Smith, 2020)
        /\([A-Z][a-z]+\s+et\s+al\.\s*,\s*\d{4}\)/g, // (Smith et al., 2020)
    ];
    const inTextCitations = inTextCitationPatterns.some(pattern => {
        const matches = text.match(pattern);
        return matches && matches.length >= 2; // 至少2个引用标记
    });
    if (inTextCitations) {
        return true;
    }
    // 检测脚注标记：上标数字或方括号数字
    const footnotePatterns = [
        /[\u00B9\u00B2\u00B3\u2074-\u2079\u00B0]/g, // 上标数字 ¹²³⁴⁵⁶⁷⁸⁹⁰
        /\[\d+\]/g, // [1], [2]
    ];
    const footnotes = footnotePatterns.some(pattern => {
        const matches = text.match(pattern);
        return matches && matches.length >= 2;
    });
    if (footnotes) {
        return true;
    }
    // 检测常见引用格式：DOI, ISBN, URL
    const citationFormatPatterns = [
        /doi[:\s]?10\.\d+\/[^\s]+/gi,
        /isbn[:\s]?\d{10,13}/gi,
        /https?:\/\/[^\s]+(?:doi|pubmed|arxiv)/gi,
    ];
    const hasCitationFormats = citationFormatPatterns.some(pattern => pattern.test(text));
    if (hasCitationFormats) {
        return true;
    }
    // 检测作者-年份格式：在括号或方括号中
    const authorYearPatterns = [
        /\([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*,\s*\d{4}[a-z]?\)/g, // (Smith, 2020)
        /\[[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*,\s*\d{4}[a-z]?\]/g, // [Smith, 2020]
    ];
    const authorYearCitations = authorYearPatterns.some(pattern => {
        const matches = text.match(pattern);
        return matches && matches.length >= 1;
    });
    if (authorYearCitations) {
        return true;
    }
    return false;
}
/**
 * 构建 Few-shot examples，为 AI 提供不同场景的评分示例
 */
function buildFewShotExamples(dimensions, hasCitations) {
    const examples = [];
    // Example 1: 高质量文档（有引用）
    if (hasCitations) {
        const example1 = {
            scores: {},
            reasoning: {}
        };
        dimensions.forEach(dim => {
            if (dim === '结构') {
                example1.scores[dim] = 9;
                example1.reasoning[dim] = '评分理由：文档结构非常清晰，采用"引言-正文-结论"的经典学术结构。引言部分明确提出了研究问题和目标，正文部分按照逻辑顺序分为三个主要章节，每个章节都有明确的主题和子标题，章节之间过渡自然流畅。结论部分总结了主要观点并提出了未来研究方向。整体结构层次分明，符合学术规范，因此给予9分。';
            }
            else if (dim === '逻辑') {
                example1.scores[dim] = 8;
                example1.reasoning[dim] = '评分理由：文档的逻辑推理链条基本完整，从问题提出到分析论证再到结论，逻辑关系清晰。论证过程中使用了归纳和演绎相结合的方法，大部分推理步骤合理。但在第三章节中存在一处逻辑跳跃，从现象描述直接跳到结论，缺少中间的分析环节，因此给予8分。';
            }
            else if (dim === '观点') {
                example1.scores[dim] = 8;
                example1.reasoning[dim] = '评分理由：文档提出的观点具有一定的新意和深度，能够从新的角度分析问题，并提出了几个有价值的见解。观点不是简单的重复已有研究，而是基于现有文献进行了创新性的整合和延伸。但观点的原创性还可以进一步提升，因此给予8分。';
            }
            else if (dim === '证据') {
                example1.scores[dim] = 7;
                example1.reasoning[dim] = '评分理由：文档使用了多个证据支持主要观点，包括统计数据、案例分析和文献引用。证据的相关性较好，能够有效支持论述。但部分证据的质量有待提升，有些数据来源不够权威，有些案例的代表性不够强，因此给予7分。';
            }
            else if (dim === '引用') {
                example1.scores[dim] = 7;
                example1.reasoning[dim] = '评分理由：文档中检测到15处引用，包括参考文献列表和文中引用标记。引用格式基本规范，使用了标准的学术引用格式。引用的文献质量较好，包括多篇权威期刊论文。但部分引用的格式不够统一，有些引用缺少页码信息，因此给予7分。';
            }
            else if (dim === '论证') {
                example1.scores[dim] = 8;
                example1.reasoning[dim] = '评分理由：论证过程基本严密，使用了多种论证方法，包括举例论证、对比论证和因果论证。论证的逻辑链条清晰，大部分论证步骤合理。但在第二章节的论证中存在一处薄弱环节，论据与论点之间的关联性不够强，因此给予8分。';
            }
            else if (dim === '表达') {
                example1.scores[dim] = 8;
                example1.reasoning[dim] = '评分理由：文字表达准确、流畅，语言精炼，用词恰当。句子结构清晰，段落组织合理。整体表达符合学术规范，专业术语使用准确。但在个别地方存在表达不够精炼的问题，有些句子过长，影响了阅读的流畅性，因此给予8分。';
            }
            else if (dim === '材料') {
                example1.scores[dim] = 7;
                example1.reasoning[dim] = '评分理由：使用的材料较为丰富，包括文献资料、统计数据和案例分析。材料来源多样，包括学术期刊、官方统计和实地调研。但材料的质量有待提升，部分材料较为陈旧，部分材料的权威性不够强，因此给予7分。';
            }
            else if (dim === '史料') {
                example1.scores[dim] = 8;
                example1.reasoning[dim] = '评分理由：史料运用较为丰富，包括档案资料、历史文献和口述史料。考证过程基本严谨，对史料的来源和可靠性进行了分析。但在部分史料的考证上还可以更加深入，有些史料的真实性还需要进一步验证，因此给予8分。';
            }
            else if (dim === '数据') {
                example1.scores[dim] = 7;
                example1.reasoning[dim] = '评分理由：数据使用基本准确，包括统计数据和实验数据。数据分析较为深入，使用了多种统计方法。但部分数据的来源不够权威，有些数据的时效性不够强，数据分析的深度还可以进一步提升，因此给予7分。';
            }
        });
        example1.verdict = '综合评价：该文档在结构和逻辑方面表现优秀，观点具有一定新意，证据和引用基本充分。整体评分：7.8/10。';
        examples.push('**示例1（高质量文档，有引用）**：\n' + JSON.stringify(example1, null, 2));
    }
    // Example 2: 中等质量文档（无引用）
    const example2 = {
        scores: {},
        reasoning: {}
    };
    dimensions.forEach(dim => {
        if (dim === '结构') {
            example2.scores[dim] = 6;
            example2.reasoning[dim] = '评分理由：文档结构基本完整，有明确的章节划分，但章节之间的逻辑关系不够清晰。引言部分提出了问题，但问题表述不够明确。正文部分分为三个章节，但章节之间的过渡略显生硬，缺乏自然的衔接。结论部分总结了主要观点，但总结不够深入。整体结构层次感不强，因此给予6分。';
        }
        else if (dim === '逻辑') {
            example2.scores[dim] = 5;
            example2.reasoning[dim] = '评分理由：文档的逻辑推理链条存在明显断裂。在第二章节中，从现象描述直接跳到结论，缺少中间的分析环节。第三章节的论证过程不够清晰，存在多处逻辑跳跃。整体逻辑不够严密，推理链条不完整，因此给予5分。';
        }
        else if (dim === '观点') {
            example2.scores[dim] = 5;
            example2.reasoning[dim] = '评分理由：文档提出的观点较为平庸，缺乏创新性。大部分观点是对已有研究的简单重复或总结，没有提出新的见解或视角。观点的深度不足，缺乏深入的分析和思考。整体观点缺乏独特性，因此给予5分。';
        }
        else if (dim === '证据') {
            example2.scores[dim] = 5;
            example2.reasoning[dim] = '评分理由：文档使用的证据不够充分，相关性较弱。部分证据与论点之间的关联性不够强，有些证据的质量一般，来源不够权威。证据的使用方式不够恰当，没有充分发挥证据的作用，因此给予5分。';
        }
        else if (dim === '引用') {
            example2.scores[dim] = 1;
            example2.reasoning[dim] = '评分理由：文档中未检测到任何引用标记、参考文献列表、脚注或文中引用。虽然文档在其他方面表现尚可，但完全缺乏学术引用，不符合学术规范。根据评分规则，无引用的文档在引用维度必须给予0-2分，因此给予1分。';
        }
        else if (dim === '论证') {
            example2.scores[dim] = 5;
            example2.reasoning[dim] = '评分理由：论证过程不够严密，说服力一般。论证方法较为单一，主要使用了举例论证，缺乏其他论证方法的支持。论证的逻辑链条存在断裂，部分论证步骤不够合理。整体论证薄弱，无法有效支持观点，因此给予5分。';
        }
        else if (dim === '表达') {
            example2.scores[dim] = 6;
            example2.reasoning[dim] = '评分理由：文字表达基本准确，但流畅性一般。部分句子结构不够清晰，存在表达模糊的地方。用词基本恰当，但个别地方用词不够准确。整体表达符合基本要求，但还有改进空间，因此给予6分。';
        }
        else if (dim === '材料') {
            example2.scores[dim] = 5;
            example2.reasoning[dim] = '评分理由：使用的材料不够丰富，质量一般。材料来源较为单一，主要来自网络资料，缺乏权威来源。材料的质量有待提升，部分材料较为陈旧，部分材料的可靠性不够强。整体材料无法有效支持论述，因此给予5分。';
        }
        else if (dim === '史料') {
            example2.scores[dim] = 5;
            example2.reasoning[dim] = '评分理由：史料运用不够丰富，考证不够严谨。使用的史料来源单一，主要来自二手资料，缺乏一手史料的支撑。考证过程较为粗糙，对史料的来源和可靠性缺乏深入分析。整体史料无法有效支持观点，因此给予5分。';
        }
        else if (dim === '数据') {
            example2.scores[dim] = 5;
            example2.reasoning[dim] = '评分理由：数据使用不够准确，分析不够深入。部分数据的来源不够权威，有些数据的时效性不够强。数据分析方法较为简单，缺乏深入的统计分析。整体数据无法有效支持观点，因此给予5分。';
        }
    });
    example2.verdict = '综合评价：该文档在结构和表达方面表现尚可，但逻辑、观点和证据方面有待改进，特别是完全缺乏学术引用。整体评分：5.2/10。';
    examples.push('**示例2（中等质量文档，无引用）**：\n' + JSON.stringify(example2, null, 2));
    return examples.join('\n\n');
}
// Discipline-specific evaluation rubrics
const RUBRICS = {
    default: {
        dimensions: ['结构', '逻辑', '观点', '证据', '引用'],
        weights: { 结构: 0.2, 逻辑: 0.25, 观点: 0.25, 证据: 0.2, 引用: 0.1 }
    },
    '哲学': {
        dimensions: ['结构', '逻辑', '观点', '论证', '引用'],
        weights: { 结构: 0.15, 逻辑: 0.3, 观点: 0.3, 论证: 0.15, 引用: 0.1 }
    },
    '文学': {
        dimensions: ['结构', '表达', '观点', '材料', '引用'],
        weights: { 结构: 0.2, 表达: 0.3, 观点: 0.25, 材料: 0.15, 引用: 0.1 }
    },
    '历史': {
        dimensions: ['结构', '逻辑', '观点', '史料', '引用'],
        weights: { 结构: 0.15, 逻辑: 0.2, 观点: 0.25, 史料: 0.3, 引用: 0.1 }
    },
    '科学': {
        dimensions: ['结构', '逻辑', '观点', '数据', '引用'],
        weights: { 结构: 0.15, 逻辑: 0.25, 观点: 0.2, 数据: 0.3, 引用: 0.1 }
    }
};
export async function evaluateAndStore(documentId) {
    // 检查依赖
    const deps = await checkProcessingDependencies(documentId, 'evaluate');
    if (!deps.ready) {
        throw new Error(`依赖未完成: ${deps.missing?.join(', ')}`);
    }
    // 更新状态为 processing
    await updateProcessingStatus(documentId, 'evaluate', 'processing');
    try {
        const doc = await prisma.document.findUnique({
            where: { id: documentId },
            include: { topic: true, summaries: { orderBy: { id: 'desc' }, take: 1 } }
        });
        if (!doc)
            throw new Error('Document not found');
        if (!doc.extractedText)
            throw new Error('Document text not extracted yet');
        const text = Buffer.from(doc.extractedText).toString('utf-8');
        // Limit text length for AI processing (configurable)
        const textLimit = AI_PROCESSING_CONFIG.TEXT_LIMITS.EVALUATE;
        const textForAi = text.slice(0, textLimit);
        if (text.length > textLimit) {
            console.log(`[Evaluate] Text truncated from ${text.length} to ${textLimit} characters`);
        }
        // Determine discipline (from topic or default)
        const discipline = doc.topic.discipline || 'default';
        const rubric = RUBRICS[discipline] || RUBRICS.default;
        const dimensions = rubric.dimensions;
        // Get summary if available
        const summary = doc.summaries[0];
        const summaryText = summary ? `文档总结：${summary.overview}` : '';
        // 检测文档中是否有引用
        const hasCitationsInDoc = hasCitations(text);
        // Build detailed evaluation criteria with specific scoring guidelines
        const criteriaDetails = {
            '结构': `评估文档的组织结构、章节划分、逻辑层次。
- 9-10分：结构非常清晰，章节划分合理，层次分明，有明确的引言、正文、结论，过渡自然流畅
- 7-8分：结构清晰，章节划分基本合理，但部分章节之间过渡略显生硬
- 5-6分：结构基本完整，但章节划分不够清晰，层次感不强
- 0-4分：结构混乱，缺乏组织，章节划分不明确，难以理解文档脉络`,
            '逻辑': `评估论证的逻辑严密性、推理链条的完整性。
- 9-10分：逻辑严密，推理链条完整，论证过程清晰，无逻辑漏洞
- 7-8分：逻辑基本严密，推理链条较为完整，但存在少量逻辑跳跃
- 5-6分：逻辑不够严密，推理链条存在明显断裂，论证过程不够清晰
- 0-4分：逻辑混乱，推理链条断裂严重，存在大量逻辑漏洞`,
            '观点': `评估观点的创新性、深度和独特性。
- 9-10分：观点新颖独特，有深度，具有原创性，能够提出新的见解或视角
- 7-8分：观点有一定新意，深度尚可，但原创性不够突出
- 5-6分：观点较为平庸，缺乏创新性，深度不足
- 0-4分：观点平庸，完全缺乏创新性，深度很浅`,
            '证据': `评估支持观点的证据质量、充分性和相关性。
- 9-10分：证据充分、相关性强、质量高，能够有力支持观点
- 7-8分：证据基本充分，相关性较好，但质量有待提升
- 5-6分：证据不够充分，相关性较弱，质量一般
- 0-4分：证据严重不足，相关性很弱，质量较差`,
            '引用': `评估引用文献的数量、质量和规范性。
- 9-10分：引用充分且规范，文献质量高，格式统一，符合学术规范
- 7-8分：引用较为充分，格式基本规范，但文献质量有待提升
- 5-6分：引用不够充分，格式不够规范，文献质量一般
- 3-4分：有少量引用但格式不规范，文献质量较低
- 0-2分：**完全无引用**（无参考文献列表、无脚注、无文中引用标记、无DOI/ISBN等），必须给予0-2分`,
            '论证': `评估论证过程的严密性和说服力。
- 9-10分：论证严密，说服力强，能够有效支持观点
- 7-8分：论证基本严密，说服力较好，但存在少量薄弱环节
- 5-6分：论证不够严密，说服力一般，存在明显薄弱环节
- 0-4分：论证薄弱，缺乏说服力，无法有效支持观点`,
            '表达': `评估文字表达的准确性和流畅性。
- 9-10分：表达准确、流畅，语言精炼，用词恰当
- 7-8分：表达基本准确、流畅，但存在少量表达不够精炼的地方
- 5-6分：表达不够准确，流畅性一般，存在表达模糊的地方
- 0-4分：表达模糊、生硬，用词不当，影响理解`,
            '材料': `评估使用的材料质量和丰富程度。
- 9-10分：材料丰富、质量高，来源多样，能够充分支持论述
- 7-8分：材料较为丰富，质量较好，但来源多样性有待提升
- 5-6分：材料不够丰富，质量一般，来源单一
- 0-4分：材料单一、质量低，无法有效支持论述`,
            '史料': `评估历史资料的运用和考证。
- 9-10分：史料丰富、考证严谨，能够有效运用历史资料支持观点
- 7-8分：史料较为丰富，考证基本严谨，但存在少量考证不够深入的地方
- 5-6分：史料不够丰富，考证不够严谨，存在明显考证粗糙的地方
- 0-4分：史料不足、考证粗糙，无法有效支持观点`,
            '数据': `评估数据的准确性和分析深度。
- 9-10分：数据准确、分析深入，能够有效运用数据支持观点
- 7-8分：数据基本准确，分析较为深入，但存在少量分析不够深入的地方
- 5-6分：数据不够准确，分析不够深入，存在明显分析浅显的地方
- 0-4分：数据不足、分析浅显，无法有效支持观点`
        };
        // Build evaluation prompt with citation detection result
        const citationNote = hasCitationsInDoc
            ? '**检测结果**：文档中检测到引用标记或参考文献列表。'
            : '**检测结果**：文档中未检测到明显的引用标记、参考文献列表、脚注或文中引用。如果确实没有引用，引用维度必须给予0-2分。';
        // Build Few-shot examples based on dimensions
        const fewShotExamples = buildFewShotExamples(dimensions, hasCitationsInDoc);
        // Build evaluation prompt
        const prompt = `你是一位经验丰富的学术评价专家。请对以下文档进行多维度学术评价。

**学科类型**：${discipline}

**评价维度及详细评分标准**：
${dimensions.map((d, i) => {
            const detail = criteriaDetails[d] || '评估文档在此维度的表现';
            return `${i + 1}. ${d}（0-10分）：
${detail}`;
        }).join('\n\n')}

${summaryText ? `**文档总结**：${summaryText}\n` : ''}

**文档内容（前8000字）**：
${textForAi}

**引用检测结果**：
${citationNote}

**引用评分规则（必须严格遵守）**：
1. **完全无引用**（无参考文献列表、无脚注、无文中引用标记、无DOI/ISBN等）：必须给予0-2分
2. **有少量引用但格式不规范**：3-5分
3. **引用充分且格式规范**：6-8分
4. **引用优秀且多样**：9-10分

**重要提醒**：
- 如果检测结果显示"未检测到引用"，且你仔细检查后确认文档确实没有任何引用，引用维度必须给予0-2分
- 不要因为文档其他方面质量好就默认给引用高分
- 评分必须客观、严格，符合学术规范
- 每个维度的评分理由必须详细说明：具体观察到的优点和不足，以及给出该分数的具体依据
- 评分理由应包含：该维度在文档中的具体表现、与评分标准的对应关系、存在的具体问题或优点

**Few-shot 示例（请参考以下格式和详细程度）**：
${fewShotExamples}

**请用JSON格式返回评价结果，格式如下**：
{
  "scores": {
    "${dimensions[0]}": 8,
    "${dimensions[1]}": 7,
    "${dimensions[2]}": 9,
    "${dimensions[3]}": 8,
    "${dimensions[4]}": 7
  },
  "verdict": "综合评价：该文档在...方面表现优秀，但在...方面有待改进。整体评分：X/10。",
  "reasoning": {
    "${dimensions[0]}": "评分理由：详细说明该维度的具体表现、优点和不足，以及给出该分数的具体依据（至少50字）",
    "${dimensions[1]}": "评分理由：详细说明该维度的具体表现、优点和不足，以及给出该分数的具体依据（至少50字）",
    "${dimensions[2]}": "评分理由：详细说明该维度的具体表现、优点和不足，以及给出该分数的具体依据（至少50字）",
    "${dimensions[3]}": "评分理由：详细说明该维度的具体表现、优点和不足，以及给出该分数的具体依据（至少50字）",
    "${dimensions[4]}": "评分理由：详细说明该维度的具体表现、优点和不足，以及给出该分数的具体依据（至少50字）"
  }
}

**输出要求**：
- 必须返回有效的JSON格式
- 所有分数必须是0-10之间的整数或小数
- 评分理由必须详细（每个维度至少50字），说明具体观察到的内容
- 不要添加任何JSON注释或额外说明文字
- 确保JSON格式正确，无尾随逗号、无未闭合的括号`;
        // Call AI
        const result = await routeAiCall({
            userId: doc.authorId,
            task: 'evaluate',
            estimatedMaxCostCents: 30,
            prompt
        });
        // Parse AI response
        let evaluationData;
        try {
            // Enhanced JSON parsing with error tolerance
            let jsonText = result.text;
            // Step 1: Try to extract JSON block
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }
            // Step 2: Fix common JSON errors
            // Remove trailing commas before closing braces/brackets
            jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
            // Remove comments (if any)
            jsonText = jsonText.replace(/\/\/.*$/gm, '');
            jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '');
            // Step 3: Try to parse
            evaluationData = JSON.parse(jsonText);
            // Step 4: Validate structure
            if (!evaluationData.scores || typeof evaluationData.scores !== 'object') {
                throw new Error('Invalid scores structure');
            }
            // Ensure all dimensions have scores
            for (const dim of dimensions) {
                if (typeof evaluationData.scores[dim] !== 'number') {
                    evaluationData.scores[dim] = 6; // Default score
                }
            }
        }
        catch (parseError) {
            console.error('[Evaluate] JSON parsing failed:', parseError.message);
            console.error('[Evaluate] Raw response:', result.text.substring(0, 500));
            // Fallback: generate basic evaluation
            const avgScore = 6; // Default average score
            evaluationData = {
                scores: dimensions.reduce((acc, dim) => {
                    acc[dim] = avgScore;
                    return acc;
                }, {}),
                verdict: '评价生成中，请稍候...',
                reasoning: {}
            };
        }
        // Normalize scores to 0-10 range
        const normalizedScores = {};
        for (const dim of dimensions) {
            const score = evaluationData.scores[dim];
            normalizedScores[dim] = Math.max(0, Math.min(10, typeof score === 'number' ? score : 6));
        }
        // 后处理验证：如果检测到无引用但AI给了>2分，自动修正
        if (!hasCitationsInDoc && dimensions.includes('引用')) {
            const citationScore = normalizedScores['引用'];
            if (citationScore > 2) {
                console.warn(`[Evaluate] Document ${documentId}: No citations detected but AI gave ${citationScore} points. Auto-correcting to 1.`);
                normalizedScores['引用'] = 1; // 修正为1分
                // 更新评分理由，说明自动修正
                if (evaluationData.reasoning) {
                    evaluationData.reasoning['引用'] = `【系统自动修正】文档中未检测到任何引用标记、参考文献列表、脚注或文中引用。虽然AI初始评分较高，但根据检测结果，引用维度应给予0-2分。已自动修正为1分。原AI评分理由：${evaluationData.reasoning['引用'] || '无'}`;
                }
                else {
                    evaluationData.reasoning = {
                        '引用': '【系统自动修正】文档中未检测到任何引用标记、参考文献列表、脚注或文中引用。根据学术规范，无引用的文档在引用维度应给予0-2分，已自动修正为1分。'
                    };
                }
            }
        }
        // Save evaluation to database (include reasoning in scores JSON for now)
        await prisma.evaluation.create({
            data: {
                documentId: doc.id,
                discipline,
                rubricVersion: 'v1.0',
                scores: {
                    ...normalizedScores,
                    _reasoning: evaluationData.reasoning || {} // Store reasoning in scores object
                },
                verdict: evaluationData.verdict || '评价完成'
            }
        });
        // Update topic discipline if not set
        if (!doc.topic.discipline && discipline !== 'default') {
            await prisma.topic.update({
                where: { id: doc.topicId },
                data: { discipline }
            });
        }
        // 更新状态为 completed
        await updateProcessingStatus(documentId, 'evaluate', 'completed');
        // Trigger disagreement and consensus analysis after evaluation completes
        // 只要有至少2个已评价的文档就触发分析（不需要等所有文档都完成）
        try {
            const { enqueueAnalyzeDisagreements, enqueueTrackConsensus, enqueueUserPairAnalysis } = await import('@/lib/queue/jobs');
            const { identifyUserPairs } = await import('@/lib/processing/userPairIdentifier');
            // Check how many documents in topic are evaluated
            const topicDocs = await prisma.document.findMany({
                where: { topicId: doc.topicId },
                select: { id: true, authorId: true, processingStatus: true }
            });
            const evaluatedDocs = topicDocs.filter(d => {
                const status = d.processingStatus || {};
                return status.evaluate === 'completed';
            });
            // 只要有至少2个已评价的文档就触发分析
            if (evaluatedDocs.length >= 2) {
                console.log(`[Evaluate] Triggering analysis for topic ${doc.topicId}, evaluated docs: ${evaluatedDocs.length}`);
                // Trigger disagreement analysis
                try {
                    const disagreementJob = await enqueueAnalyzeDisagreements(doc.topicId, documentId);
                    console.log(`[Evaluate] Disagreement analysis job enqueued: ${disagreementJob.id} (${disagreementJob.name})`);
                }
                catch (err) {
                    console.error(`[Evaluate] Failed to enqueue disagreement analysis:`, err.message);
                }
                // Trigger user pair analysis (识别新产生的用户对)
                try {
                    const userPairs = await identifyUserPairs(doc.topicId);
                    // 找出包含当前文档作者的用户对
                    const newPairs = userPairs.filter(pair => pair.userId1 === doc.authorId || pair.userId2 === doc.authorId);
                    if (newPairs.length > 0) {
                        // 分析所有包含当前文档作者的用户对
                        for (const pair of newPairs) {
                            try {
                                const userPairJob = await enqueueUserPairAnalysis(doc.topicId, pair.userId1, pair.userId2);
                                console.log(`[Evaluate] User pair analysis job enqueued: ${userPairJob.id} for users ${pair.userId1} and ${pair.userId2}`);
                            }
                            catch (err) {
                                console.error(`[Evaluate] Failed to enqueue user pair analysis:`, err.message);
                            }
                        }
                    }
                    else {
                        // 如果没有新用户对，分析所有用户对（可能已有用户对需要更新）
                        const allPairsJob = await enqueueUserPairAnalysis(doc.topicId);
                        console.log(`[Evaluate] All user pairs analysis job enqueued: ${allPairsJob.id}`);
                    }
                }
                catch (err) {
                    console.error(`[Evaluate] Failed to enqueue user pair analysis:`, err.message);
                }
                // Trigger consensus tracking (更新话题级别快照)
                try {
                    const consensusJob = await enqueueTrackConsensus(doc.topicId);
                    console.log(`[Evaluate] Consensus tracking job enqueued: ${consensusJob.id} (${consensusJob.name})`);
                }
                catch (err) {
                    console.error(`[Evaluate] Failed to enqueue consensus tracking:`, err.message);
                }
            }
            else {
                console.log(`[Evaluate] Not enough evaluated documents (${evaluatedDocs.length}/2) for topic ${doc.topicId}`);
            }
        }
        catch (err) {
            console.error(`[Evaluate] Failed to enqueue analysis for topic ${doc.topicId}:`, err.message);
            console.error(`[Evaluate] Error stack:`, err.stack);
            // Continue even if analysis fails
        }
        return { ok: true };
    }
    catch (error) {
        // 更新状态为 failed
        await updateProcessingStatus(documentId, 'evaluate', 'failed', error.message);
        console.error(`[Evaluate] Evaluation failed for document ${documentId}:`, error);
        throw error;
    }
}
