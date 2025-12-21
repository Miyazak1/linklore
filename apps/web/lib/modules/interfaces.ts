/**
 * 模块接口定义
 * 
 * 目的：定义各模块的接口，用于模块间通信和依赖管理
 * 
 * 使用方式：
 * - 各模块实现对应的接口
 * - 其他模块通过接口访问，而不是直接导入实现
 * 
 * 注意：这是渐进式隔离的一部分，当前主要用于文档和类型定义
 */

/**
 * 基础模块接口
 */
export interface IModule {
	name: string;
	version: string;
	dependencies?: string[];
}

/**
 * 图书馆模块接口
 */
export interface ILibraryModule extends IModule {
	/**
	 * 搜索图书
	 */
	searchBooks: (query: string) => Promise<Array<{
		id?: string;
		title: string;
		author: string | null;
		coverUrl: string | null;
		overview?: string | null;
		source?: string | null;
	}>>;

	/**
	 * 根据ID获取图书
	 */
	getBookById: (id: string) => Promise<{
		id: string;
		title: string;
		author: string | null;
		coverUrl: string | null;
		overview?: string | null;
		source?: string | null;
		assets?: Array<{ id: string; fileKey: string; mime: string }>;
	} | null>;
}

/**
 * 讨论版模块接口
 */
export interface IDiscussionModule extends IModule {
	/**
	 * 创建话题
	 */
	createTopic: (title: string, description?: string) => Promise<{
		id: string;
		title: string;
	}>;

	/**
	 * 获取话题
	 */
	getTopic: (id: string) => Promise<{
		id: string;
		title: string;
		subtitle?: string;
	} | null>;
}

/**
 * 语义溯源模块接口
 */
export interface ITraceModule extends IModule {
	/**
	 * 创建溯源
	 */
	createTrace: (data: {
		title: string;
		type: string;
		content: string;
	}) => Promise<{
		id: string;
		title: string;
	}>;

	/**
	 * 获取溯源
	 */
	getTrace: (id: string) => Promise<{
		id: string;
		title: string;
		type: string;
		content: string;
	} | null>;
}

/**
 * 聊天模块接口
 */
export interface IChatModule extends IModule {
	/**
	 * 创建聊天室
	 */
	createRoom: (data: {
		type: 'SOLO' | 'DUO';
		topic?: string;
		topicDescription?: string;
	}) => Promise<{
		id: string;
		type: string;
	}>;

	/**
	 * 获取聊天室
	 */
	getRoom: (id: string) => Promise<{
		id: string;
		type: string;
		topic?: string;
	} | null>;
}

