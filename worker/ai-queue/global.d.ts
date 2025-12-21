// Worker 环境的全局类型声明
// 用于避免 TypeScript 检查浏览器 API 和未安装的模块

declare const window: never;
declare const localStorage: never;

// 声明这些模块存在（在 apps/web 中使用，但 worker 不直接使用）
declare module 'sanitize-html' {
	const sanitize: any;
	export default sanitize;
}

declare module 'ali-oss' {
	const OSS: any;
	export default OSS;
}
