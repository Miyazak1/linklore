import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('BaikeFetcher');

/**
 * 百度百科配置
 * 使用百度百科的随机词条功能
 */
const BAIKE_RANDOM_URL = 'https://baike.baidu.com/randomlemma';
const BAIKE_API_BASE = 'https://baike.baidu.com/api/openapi/BaikeLemmaCardApi';

/**
 * 从百度百科获取随机词条标题
 * 通过访问随机词条页面并解析标题
 */
export async function fetchRandomWikipediaTitle(): Promise<{
	title: string;
	description?: string;
	category?: string;
} | null> {
	try {
		// 方法1：使用百度百科的随机词条列表
		// 百度百科没有公开的随机API，我们使用一个包含常见词条的列表
		// 然后随机选择一个并获取其信息
		const commonTitles = [
			// 城市
			'北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '西安', '南京', '武汉',
			// 科学
			'人工智能', '机器学习', '深度学习', '量子力学', '相对论', '黑洞', 'DNA', '基因',
			// 文学
			'红楼梦', '西游记', '水浒传', '三国演义', '唐诗', '宋词', '元曲',
			// 历史
			'长城', '故宫', '天坛', '颐和园', '秦始皇', '汉武帝', '唐太宗',
			// 人物
			'孔子', '老子', '孟子', '庄子', '李白', '杜甫', '苏轼',
			// 地理
			'太阳系', '银河系', '宇宙', '地球', '月球', '火星',
			// 其他
			'互联网', '计算机', '手机', '汽车', '飞机', '火车'
		];

		// 随机选择一个词条
		const randomTitle = commonTitles[Math.floor(Math.random() * commonTitles.length)];

		// 获取该词条的详细信息
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000);

		const searchUrl = `https://baike.baidu.com/item/${encodeURIComponent(randomTitle)}`;
		const response = await fetch(searchUrl, {
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'zh-CN,zh;q=0.9',
				'Referer': 'https://baike.baidu.com/'
			},
			redirect: 'follow',
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`百度百科请求失败: ${response.status}`);
		}

		// 获取页面内容以提取描述
		const html = await response.text();
		log.debug('获取到HTML页面', { htmlLength: html.length });
		const description = extractDescriptionFromHtml(html);
		log.debug('提取结果', { 
			descriptionLength: description?.length || 0,
			hasDescription: !!description,
			preview: description?.substring(0, 100) 
		});
		const category = extractCategory(randomTitle, description || '');

		log.debug('获取百度百科词条成功', { title: randomTitle, description: description?.substring(0, 50) });

		return {
			title: randomTitle,
			description,
			category
		};
	} catch (error: any) {
		log.error('获取百度百科词条失败', error as Error);
		
		// 如果方法1失败，尝试备用方法：使用预定义词条列表
		try {
			return await fetchRandomBaikeTitleFallback();
		} catch (fallbackError: any) {
			log.error('备用方法也失败', fallbackError as Error);
			return null;
		}
	}
}

/**
 * 备用方法：使用百度百科移动端API或搜索API
 */
async function fetchRandomBaikeTitleFallback(): Promise<{
	title: string;
	description?: string;
	category?: string;
} | null> {
	try {
		// 方法：使用一些常见的词条作为随机选择
		// 注意：这不是真正的随机，但可以作为备用方案
		const commonTitles = [
			'北京', '上海', '广州', '深圳', '杭州',
			'人工智能', '机器学习', '深度学习',
			'量子力学', '相对论', '黑洞',
			'红楼梦', '西游记', '水浒传', '三国演义',
			'唐诗', '宋词', '元曲',
			'长城', '故宫', '天坛',
			'孔子', '老子', '孟子',
			'太阳系', '银河系', '宇宙'
		];

		// 随机选择一个
		const randomTitle = commonTitles[Math.floor(Math.random() * commonTitles.length)];

		// 尝试获取该词条的描述
		try {
			const searchUrl = `https://baike.baidu.com/item/${encodeURIComponent(randomTitle)}`;
			const res = await fetch(searchUrl, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					'Accept': 'text/html,application/xhtml+xml'
				}
			});

			if (res.ok) {
				const html = await res.text();
				const description = extractDescriptionFromHtml(html);
				return {
					title: randomTitle,
					description,
					category: extractCategory(randomTitle, description || '')
				};
			}
		} catch (err) {
			// 如果获取描述失败，只返回标题
		}

		return {
			title: randomTitle,
			category: extractCategory(randomTitle, '')
		};
	} catch (error: any) {
		log.error('备用方法失败', error as Error);
		return null;
	}
}

/**
 * 从HTML中提取描述（保留分段信息）
 * 提取多个段落，用换行符分隔，保持段落结构
 */
function extractDescriptionFromHtml(html: string): string | undefined {
	try {
		log.debug('开始提取百度百科内容');
		
		// 方法1：提取 J-summary 内的所有 data-tag="paragraph" 段落
		// 这是最准确的方法，直接提取百度百科的段落标记
		const summaryMatch = html.match(/<div[^>]*class=["'][^"']*J-summary[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
		if (summaryMatch && summaryMatch[1]) {
			const summaryContent = summaryMatch[1];
			log.debug('找到 J-summary 区域', { contentLength: summaryContent.length });
			
			// 提取所有 data-tag="paragraph" 的div
			const paraMatches = summaryContent.match(/<div[^>]*data-tag=["']paragraph["'][^>]*>([\s\S]*?)<\/div>/gi);
			if (paraMatches && paraMatches.length > 0) {
				log.debug('找到 paragraph 段落', { count: paraMatches.length });
				const paragraphs: string[] = [];
				
				for (let i = 0; i < paraMatches.length; i++) {
					const paraDiv = paraMatches[i];
					// 提取div中的文本内容
					let paraText = paraDiv
						.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // 移除script
						.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // 移除style
						.replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '') // 移除sup标签（参考文献标注）
						.replace(/<[^>]+>/g, '') // 移除所有其他HTML标签
						.replace(/&nbsp;/g, ' ')
						.replace(/&lt;/g, '<')
						.replace(/&gt;/g, '>')
						.replace(/&amp;/g, '&')
						.replace(/&quot;/g, '"')
						.replace(/&#39;/g, "'")
						.replace(/&apos;/g, "'")
						.replace(/\s+/g, ' ') // 段落内部：合并所有空白符为单个空格
						.trim();
					
					if (paraText.length > 10) { // 过滤掉太短的段落
						paragraphs.push(paraText);
						log.debug(`段落 ${i+1}`, { 
							length: paraText.length, 
							preview: paraText.substring(0, 80) 
						});
					}
				}
				
				if (paragraphs.length > 0) {
					// 用双换行符连接段落，这样前端会识别为段落间距
					const description = paragraphs.join('\n\n');
					log.debug('方法1（J-summary段落）提取成功', { 
						totalParagraphs: paragraphs.length, 
						descriptionLength: description.length,
						paragraphLengths: paragraphs.map(p => p.length),
						// 显示前3个段落的预览
						paragraph1: paragraphs[0]?.substring(0, 60),
						paragraph2: paragraphs[1]?.substring(0, 60),
						paragraph3: paragraphs[2]?.substring(0, 60),
						// 检查是否有换行符
						hasNewlines: description.includes('\n\n')
					});
					return description;
				}
			} else {
				log.debug('方法1：J-summary 中未找到 paragraph 段落');
			}
		} else {
			log.debug('方法1：未找到 J-summary 区域');
		}
		
		// 方法2：提取 J-summary 区域（百度百科的摘要区域）
		// class格式: lemmaSummary_xxxxx J-summary
		const summaryStart = html.search(/<div[^>]*class=["'][^"']*J-summary[^"']*["'][^>]*>/i);
		if (summaryStart >= 0) {
			log.debug('找到 J-summary 区域');
			// 找到开始位置后，需要找到对应的结束标签
			let depth = 0;
			let pos = summaryStart;
			let startPos = -1;
			
			// 找到开始标签的结束位置
			const startTagEnd = html.indexOf('>', summaryStart);
			if (startTagEnd >= 0) {
				startPos = startTagEnd + 1;
				depth = 1;
				pos = startPos;
				
				// 查找匹配的结束标签
				while (pos < html.length && depth > 0) {
					const nextOpen = html.indexOf('<div', pos);
					const nextClose = html.indexOf('</div>', pos);
					
					if (nextClose < 0) break;
					
					if (nextOpen >= 0 && nextOpen < nextClose) {
						depth++;
						pos = html.indexOf('>', nextOpen) + 1;
					} else {
						depth--;
						if (depth === 0) {
							// 找到匹配的结束标签
							const rawContent = html.substring(startPos, nextClose);
							log.debug('J-summary 提取到 rawContent 长度', { length: rawContent.length });
							
							// 提取所有文本内容，保留段落结构
							let description = rawContent
								.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // 移除script
								.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // 移除style
								.replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '') // 移除sup标签（参考文献标注）
								.replace(/<div[^>]*class=["'][^"']*para-title[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '\n\n') // para-title转为段落分隔
								.replace(/<div[^>]*>/gi, '') // 移除div开始标签
								.replace(/<\/div>/gi, '\n') // div结束标签转为换行
								.replace(/<br\s*\/?>/gi, '\n') // br转为换行
								.replace(/<[^>]+>/g, '') // 移除所有其他HTML标签
								.replace(/&nbsp;/g, ' ')
								.replace(/&lt;/g, '<')
								.replace(/&gt;/g, '>')
								.replace(/&amp;/g, '&')
								.replace(/&quot;/g, '"')
								.replace(/&#39;/g, "'")
								.replace(/&apos;/g, "'")
								.replace(/\n{3,}/g, '\n\n') // 多个换行符合并为两个
								.split('\n')
								.map(line => line.trim())
								.filter(line => line.length > 0)
								.join('\n\n')
								.trim();
							
							if (description.length > 0) {
								log.debug('方法2（J-summary）提取成功', { 
									descriptionLength: description.length,
									preview: description.substring(0, 100)
								});
								return description;
							}
						} else {
							pos = nextClose + 6;
						}
					}
				}
			}
			log.debug('方法2（J-summary深度匹配）：未找到匹配的结束标签');
		} else {
			log.debug('方法2：未找到 J-summary 区域');
		}
		
		// 方法3：尝试提取 main-content 或 content 区域
		const mainContentStart = html.search(/<div[^>]*class=["'][^"']*main-content[^"']*["'][^>]*>/i);
		if (mainContentStart >= 0) {
			log.debug('找到 main-content 区域');
			// 提取 main-content 中的所有段落
			const contentEnd = html.indexOf('</body>', mainContentStart);
			const mainContent = html.substring(mainContentStart, contentEnd > 0 ? contentEnd : html.length);
			
			// 提取所有 <p> 标签
			const paragraphMatches = mainContent.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
			if (paragraphMatches && paragraphMatches.length > 0) {
				log.debug('main-content 中找到段落', { count: paragraphMatches.length });
				const paragraphs: string[] = [];
				for (const pTag of paragraphMatches) {
					const textMatch = pTag.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
					if (textMatch && textMatch[1]) {
						let paraText = textMatch[1]
							.replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '') // 移除sup标签
							.replace(/<[^>]+>/g, '')
							.replace(/&nbsp;/g, ' ')
							.replace(/&lt;/g, '<')
							.replace(/&gt;/g, '>')
							.replace(/&amp;/g, '&')
							.replace(/&quot;/g, '"')
							.replace(/&#39;/g, "'")
							.replace(/&apos;/g, "'")
							.trim();
						if (paraText.length > 20) { // 过滤掉太短的段落（可能是导航等）
							paragraphs.push(paraText);
						}
					}
				}
				
				if (paragraphs.length > 0) {
					// 取所有段落，不做限制
					const description = paragraphs.join('\n\n');
					log.debug('main-content 提取成功', { 
						totalParagraphs: paragraphs.length, 
						descriptionLength: description.length,
						paragraphLengths: paragraphs.map(p => p.length).slice(0, 10)
					});
					return description;
				}
			}
		} else {
			log.debug('方法3：未找到 main-content 区域');
		}
		
		// 方法4：提取旧版 lemma-summary div（后备方案）
		const lemmaSummaryStart = html.search(/<div[^>]*class=["'][^"']*lemma-summary[^"']*["'][^>]*>/i);
		if (lemmaSummaryStart >= 0) {
			// 找到开始位置后，需要找到对应的结束标签
			// 由于可能有嵌套的div，需要计算div的嵌套深度
			let depth = 0;
			let pos = lemmaSummaryStart;
			let startPos = -1;
			
			// 找到开始标签的结束位置
			const startTagEnd = html.indexOf('>', lemmaSummaryStart);
			if (startTagEnd >= 0) {
				startPos = startTagEnd + 1;
				depth = 1;
				pos = startPos;
				
				// 查找匹配的结束标签
				while (pos < html.length && depth > 0) {
					const nextOpen = html.indexOf('<div', pos);
					const nextClose = html.indexOf('</div>', pos);
					
					if (nextClose < 0) break;
					
					if (nextOpen >= 0 && nextOpen < nextClose) {
						// 找到嵌套的div开始标签
						depth++;
						pos = html.indexOf('>', nextOpen) + 1;
					} else {
						// 找到div结束标签
						depth--;
						if (depth === 0) {
							// 找到了匹配的结束标签，获取完整的rawContent
							const rawContent = html.substring(startPos, nextClose);
							log.debug('提取到 rawContent 长度', { length: rawContent.length });
							
							// 方法1.1：优先提取所有 <p> 标签内的文本（百度百科通常使用<p>标签表示段落）
							const paragraphMatches = rawContent.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
							log.debug('找到段落数量', { count: paragraphMatches?.length || 0 });
							if (paragraphMatches && paragraphMatches.length > 0) {
								const paragraphs: string[] = [];
								for (const pTag of paragraphMatches) {
									const textMatch = pTag.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
									if (textMatch && textMatch[1]) {
										let paraText = textMatch[1]
											.replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '') // 移除sup标签
											.replace(/<[^>]+>/g, '') // 移除所有 HTML 标签
											.replace(/&nbsp;/g, ' ')
											.replace(/&lt;/g, '<')
											.replace(/&gt;/g, '>')
											.replace(/&amp;/g, '&')
											.replace(/&quot;/g, '"')
											.replace(/&#39;/g, "'")
											.replace(/&apos;/g, "'")
											.replace(/\\n/g, ' ')
											.replace(/\\r\\n/g, ' ')
											.replace(/\\r/g, ' ')
											.trim();
										if (paraText.length > 0) {
											paragraphs.push(paraText);
										}
									}
								}
								
								// 如果成功提取到段落，用两个换行符分隔
								if (paragraphs.length > 0) {
									let description = paragraphs.join('\n\n');
									log.debug('方法4（lemma-summary深度匹配）提取成功', { 
										paragraphs: paragraphs.length, 
										length: description.length,
										paragraphLengths: paragraphs.map(p => p.length)
									});
									// 不进行任何截断，直接返回完整内容
									return description;
								}
							}
							
							// 方法1.2：如果没有找到<p>标签，尝试提取所有文本内容（处理其他HTML结构）
							// 移除所有HTML标签，保留文本和段落结构
							let description = rawContent
								.replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '') // 移除sup标签（参考文献标注）
								.replace(/<p[^>]*>/gi, '\n\n') // 将<p>标签转换为段落分隔
								.replace(/<\/p>/gi, '') // 移除</p>标签
								.replace(/<br\s*\/?>/gi, '\n') // 将<br>标签转换为换行
								.replace(/<div[^>]*>/gi, '\n') // 将<div>标签转换为换行
								.replace(/<\/div>/gi, '') // 移除</div>标签
								.replace(/<span[^>]*>/gi, '') // 移除<span>标签
								.replace(/<\/span>/gi, '') // 移除</span>标签
								.replace(/<a[^>]*>/gi, '') // 移除<a>标签
								.replace(/<\/a>/gi, '') // 移除</a>标签
								.replace(/<[^>]+>/g, '') // 移除所有其他HTML标签
								.replace(/&nbsp;/g, ' ') // 将&nbsp;转换为空格
								.replace(/&lt;/g, '<') // 解码HTML实体
								.replace(/&gt;/g, '>')
								.replace(/&amp;/g, '&')
								.replace(/&quot;/g, '"')
								.replace(/&#39;/g, "'")
								.replace(/&apos;/g, "'")
								.replace(/\\n/g, '\n') // 将\n转换为真正的换行符
								.replace(/\\r\\n/g, '\n')
								.replace(/\\r/g, '\n')
								.replace(/\n{3,}/g, '\n\n') // 将多个连续换行符合并为两个（段落分隔）
								.replace(/\n\s*\n/g, '\n\n') // 确保段落分隔符之间没有空格
								.trim();
							
							if (description.length > 0) {
								log.debug('方法4（lemma-summary文本提取）提取成功', { length: description.length });
								// 不进行任何截断，直接返回完整内容
								return description;
							}
						} else {
							pos = nextClose + 6; // '</div>' 的长度是6
						}
					}
				}
			}
			log.debug('方法4（深度匹配）：未找到匹配的结束标签');
			
			// 方法5：如果深度匹配失败，使用正则表达式作为后备方案
			log.debug('尝试方法5（lemma-summary正则后备）');
			const paraMatches = html.match(/<div[^>]*class=["'][^"']*lemma-summary[^"']*["'][^>]*>([\s\S]*)<\/div>/i);
			if (paraMatches && paraMatches[1]) {
				let rawContent = paraMatches[1];
				log.debug('方法5提取到 rawContent 长度', { length: rawContent.length });
				
				// 优先提取所有 <p> 标签内的文本
				const paragraphMatches = rawContent.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
				log.debug('方法5找到段落数量', { count: paragraphMatches?.length || 0 });
				if (paragraphMatches && paragraphMatches.length > 0) {
					const paragraphs: string[] = [];
					for (const pTag of paragraphMatches) {
						const textMatch = pTag.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
						if (textMatch && textMatch[1]) {
							let paraText = textMatch[1]
								.replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '') // 移除sup标签
								.replace(/<[^>]+>/g, '') // 移除所有 HTML 标签
								.replace(/&nbsp;/g, ' ')
								.replace(/&lt;/g, '<')
								.replace(/&gt;/g, '>')
								.replace(/&amp;/g, '&')
								.replace(/&quot;/g, '"')
								.replace(/&#39;/g, "'")
								.replace(/&apos;/g, "'")
								.replace(/\\n/g, ' ')
								.replace(/\\r\\n/g, ' ')
								.replace(/\\r/g, ' ')
								.trim();
							if (paraText.length > 0) {
								paragraphs.push(paraText);
							}
						}
					}
					
					if (paragraphs.length > 0) {
						let description = paragraphs.join('\n\n');
						log.debug('方法5（p标签）提取成功', { 
							paragraphs: paragraphs.length, 
							length: description.length,
							paragraphLengths: paragraphs.map(p => p.length)
						});
						// 直接返回完整内容，不进行任何截断
						return description;
					}
				}
				
				// 如果没有找到 <p> 标签，使用原来的方法提取
				let description = rawContent
					.replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '') // 移除sup标签（参考文献标注）
					.replace(/<p[^>]*>/gi, '\n\n') // 将<p>标签转换为段落分隔
					.replace(/<\/p>/gi, '') // 移除</p>标签
					.replace(/<br\s*\/?>/gi, '\n') // 将<br>标签转换为换行
					.replace(/<div[^>]*>/gi, '\n') // 将<div>标签转换为换行
					.replace(/<\/div>/gi, '') // 移除</div>标签
					.replace(/<[^>]+>/g, '')
					.replace(/&nbsp;/g, ' ')
					.replace(/&lt;/g, '<')
					.replace(/&gt;/g, '>')
					.replace(/&amp;/g, '&')
					.replace(/&quot;/g, '"')
					.replace(/&#39;/g, "'")
					.replace(/&apos;/g, "'")
					.replace(/\\n/g, '\n')
					.replace(/\\r\\n/g, '\n')
					.replace(/\\r/g, '\n')
					.replace(/\n{3,}/g, '\n\n') // 将多个连续换行符合并为两个（段落分隔）
					.replace(/\n\s*\n/g, '\n\n') // 确保段落分隔符之间没有空格
					.trim();
				
				if (description.length > 0) {
					log.debug('方法5（文本提取）提取成功', { length: description.length });
					// 不进行任何截断，直接返回完整内容
					return description;
				}
			} else {
				log.debug('方法5：未找到 lemma-summary div');
			}
		} else {
			log.debug('方法4：未找到 lemma-summary 区域');
		}
		
		// 方法6：尝试提取 lemmaSummary（百度百科的摘要，可能包含多个段落）
		log.debug('尝试方法6（lemmaSummary JSON）');
		// 使用更宽松的正则表达式，提取所有段落
		const jsonSummaryMatch = html.match(/lemmaSummary["']\s*:\s*["']([^"']+)["']/i);
		if (jsonSummaryMatch && jsonSummaryMatch[1]) {
			// 解码 HTML 实体，保留换行符
			let description = jsonSummaryMatch[1]
				.replace(/\\n/g, '\n') // 将 \n 转换为真正的换行符
				.replace(/\\r\\n/g, '\n') // 将 \r\n 转换为换行符
				.replace(/\\r/g, '\n') // 将 \r 转换为换行符
				.trim();
			
			// 确保最后一句以句号结尾（即使内容没有超过限制）
			// 如果最后一句以逗号结尾，往前找到句号
			if (description.length > 0) {
				const lastChar = description[description.length - 1];
				// 如果以逗号、分号等非句子结束符结尾，往前找句号
				if (lastChar === '，' || lastChar === ',' || lastChar === '；' || lastChar === ';' || 
				    lastChar === '：' || lastChar === ':' || lastChar === '"' || lastChar === '"' || 
				    lastChar === '' || lastChar === '' || lastChar === '）' || lastChar === ')') {
					// 往前找最后一个句子结束符
					const lastSentenceEnd = Math.max(
						description.lastIndexOf('。'),
						description.lastIndexOf('？'),
						description.lastIndexOf('！'),
						description.lastIndexOf('.'),
						description.lastIndexOf('?'),
						description.lastIndexOf('!')
					);
					if (lastSentenceEnd > 0) {
						description = description.substring(0, lastSentenceEnd + 1);
					}
				}
			}
			
			// 如果内容过长，在段落边界处截断，确保最后一句以句号结尾
			const maxLength = 10000; // 增加到10000字符
			if (description.length > maxLength) {
				const truncated = description.substring(0, maxLength);
				
				// 优先在段落边界（换行符）处截断
				const lastNewline = truncated.lastIndexOf('\n');
				if (lastNewline > maxLength * 0.7) {
					// 如果最后一个换行符在70%位置之后，在换行符处截断
					description = truncated.substring(0, lastNewline).trim();
					// 确保最后一句以句号结尾
					if (!description.endsWith('。') && !description.endsWith('？') && !description.endsWith('！') && 
					    !description.endsWith('.') && !description.endsWith('?') && !description.endsWith('!')) {
						// 往前找最后一个句子结束符
						const lastSentenceEnd = Math.max(
							description.lastIndexOf('。'),
							description.lastIndexOf('？'),
							description.lastIndexOf('！'),
							description.lastIndexOf('.'),
							description.lastIndexOf('?'),
							description.lastIndexOf('!')
						);
						if (lastSentenceEnd > description.length * 0.5) {
							description = description.substring(0, lastSentenceEnd + 1);
						}
					}
					return description;
				}
				
				// 其次在句子结束符（句号、问号、感叹号）处截断，确保最后一句完整
				const lastSentenceEnd = Math.max(
					truncated.lastIndexOf('。'),
					truncated.lastIndexOf('？'),
					truncated.lastIndexOf('！'),
					truncated.lastIndexOf('.'),
					truncated.lastIndexOf('?'),
					truncated.lastIndexOf('!')
				);
				if (lastSentenceEnd > maxLength * 0.7) {
					// 在句子结束符处截断，确保最后一句完整
					description = truncated.substring(0, lastSentenceEnd + 1).trim();
				} else {
					// 如果找不到句子结束符，继续往前找，直到找到为止
					let foundEnd = false;
					for (let i = maxLength - 1; i >= maxLength * 0.5; i--) {
						const char = truncated[i];
						if (char === '。' || char === '？' || char === '！' || 
						    char === '.' || char === '?' || char === '!') {
							description = truncated.substring(0, i + 1).trim();
							foundEnd = true;
							break;
						}
					}
					if (!foundEnd) {
						// 如果实在找不到，在段落边界处截断
						description = truncated.substring(0, lastNewline > 0 ? lastNewline : maxLength).trim();
					}
				}
			}
			log.debug('方法6提取成功', { length: description.length });
			return description;
		}
		
		log.debug('方法6：未找到 lemmaSummary');

		// 方法7：尝试提取 meta description
		log.debug('尝试方法7（meta description）');
		const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
		if (metaMatch && metaMatch[1]) {
			let description = metaMatch[1]
				.replace(/\\n/g, '\n')
				.replace(/\\r\\n/g, '\n')
				.replace(/\\r/g, '\n')
				.trim();
			
			// 确保最后一句以句号结尾
			if (description.length > 0) {
				const lastChar = description[description.length - 1];
				if (lastChar === '，' || lastChar === ',' || lastChar === '；' || lastChar === ';' || 
				    lastChar === '：' || lastChar === ':' || lastChar === '"' || lastChar === '"' || 
				    lastChar === '' || lastChar === '' || lastChar === '）' || lastChar === ')') {
					const lastSentenceEnd = Math.max(
						description.lastIndexOf('。'),
						description.lastIndexOf('？'),
						description.lastIndexOf('！'),
						description.lastIndexOf('.'),
						description.lastIndexOf('?'),
						description.lastIndexOf('!')
					);
					if (lastSentenceEnd > 0) {
						description = description.substring(0, lastSentenceEnd + 1);
					}
				}
			}
			
			// 如果内容过长，在段落边界处截断，确保最后一句以句号结尾
			const maxLength = 10000;
			if (description.length > maxLength) {
				const truncated = description.substring(0, maxLength);
				
				// 优先在段落边界（换行符）处截断
				const lastNewline = truncated.lastIndexOf('\n');
				if (lastNewline > maxLength * 0.7) {
					description = truncated.substring(0, lastNewline).trim();
					// 确保最后一句以句号结尾
					if (!description.endsWith('。') && !description.endsWith('？') && !description.endsWith('！') && 
					    !description.endsWith('.') && !description.endsWith('?') && !description.endsWith('!')) {
						const lastSentenceEnd = Math.max(
							description.lastIndexOf('。'),
							description.lastIndexOf('？'),
							description.lastIndexOf('！'),
							description.lastIndexOf('.'),
							description.lastIndexOf('?'),
							description.lastIndexOf('!')
						);
						if (lastSentenceEnd > description.length * 0.5) {
							description = description.substring(0, lastSentenceEnd + 1);
						}
					}
					return description;
				}
				
				// 其次在句子结束符处截断
				const lastSentenceEnd = Math.max(
					truncated.lastIndexOf('。'),
					truncated.lastIndexOf('？'),
					truncated.lastIndexOf('！'),
					truncated.lastIndexOf('.'),
					truncated.lastIndexOf('?'),
					truncated.lastIndexOf('!')
				);
				if (lastSentenceEnd > maxLength * 0.7) {
					description = truncated.substring(0, lastSentenceEnd + 1).trim();
				} else {
					// 继续往前找句子结束符
					let foundEnd = false;
					for (let i = maxLength - 1; i >= maxLength * 0.5; i--) {
						const char = truncated[i];
						if (char === '。' || char === '？' || char === '！' || 
						    char === '.' || char === '?' || char === '!') {
							description = truncated.substring(0, i + 1).trim();
							foundEnd = true;
							break;
						}
					}
					if (!foundEnd) {
						description = truncated.substring(0, lastNewline > 0 ? lastNewline : maxLength).trim();
					}
				}
			}
			log.debug('方法7提取成功', { length: description.length });
			return description;
		}
		
		log.debug('方法7：未找到 meta description');
		
		log.warn('所有提取方法都失败了');

	} catch (err) {
		// 解析失败，返回undefined
		log.error('提取描述时发生错误', err as Error);
	}
	return undefined;
}

/**
 * 从标题和内容中提取分类
 */
function extractCategory(title: string, content: string): string {
	// 简单的分类提取逻辑
	// 可以根据需要扩展
	
	if (title.includes('人物') || title.includes('人') || content.includes('人物')) {
		return '人物';
	}
	if (title.includes('历史') || content.includes('历史')) {
		return '历史';
	}
	if (title.includes('地理') || title.includes('国家') || title.includes('城市')) {
		return '地理';
	}
	if (title.includes('科学') || title.includes('技术') || title.includes('理论')) {
		return '科学';
	}
	if (title.includes('文学') || title.includes('作品') || title.includes('小说')) {
		return '文学';
	}
	if (title.includes('艺术') || title.includes('音乐') || title.includes('绘画')) {
		return '艺术';
	}
	
	return '综合';
}

/**
 * 验证标题是否适合作为游戏题目
 * 过滤掉太短、太长或包含特殊字符的标题
 */
export function isValidGameTitle(title: string): boolean {
	// 标题长度应该在2-50个字符之间（中文词条通常2-4个字）
	if (title.length < 2 || title.length > 50) {
		return false;
	}

	// 不应该包含某些特殊字符
	if (/[<>{}[\]\\|]/.test(title)) {
		return false;
	}

	// 不应该全是数字或符号
	if (/^[\d\s\-_]+$/.test(title)) {
		return false;
	}

	return true;
}

