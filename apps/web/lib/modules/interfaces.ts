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








