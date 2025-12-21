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
		const description = extractDescriptionFromHtml(html);
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
 * 从HTML中提取描述
 */
function extractDescriptionFromHtml(html: string): string | undefined {
	try {
		// 尝试提取meta description
		const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
		if (metaMatch && metaMatch[1]) {
			return metaMatch[1].trim().substring(0, 200);
		}

		// 尝试提取lemmaSummary（百度百科的摘要）
		const summaryMatch = html.match(/lemmaSummary["']\s*:\s*["']([^"']+)["']/i);
		if (summaryMatch && summaryMatch[1]) {
			return summaryMatch[1].trim().substring(0, 200);
		}

		// 尝试提取第一个段落
		const paraMatch = html.match(/<div[^>]*class=["'][^"']*lemma-summary[^"']*["'][^>]*>([^<]+)</i);
		if (paraMatch && paraMatch[1]) {
			return paraMatch[1].trim().substring(0, 200);
		}
	} catch (err) {
		// 解析失败，返回undefined
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

