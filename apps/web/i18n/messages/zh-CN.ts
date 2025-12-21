export default {
	common: {
		appName: "LinkLore",
		appDescription: "小规模学术讨论平台（文档即话题）",
		loading: "加载中...",
		error: "错误",
		success: "成功",
		cancel: "取消",
		confirm: "确认",
		save: "保存",
		delete: "删除",
		edit: "编辑",
		search: "搜索",
		upload: "上传",
		download: "下载",
		back: "返回"
	},
	nav: {
		home: "首页",
		upload: "发起话题（上传文档）",
		library: "公共图书馆",
		practices: "实践记录",
		aiSettings: "我的 AI",
		shelf: "我的书架"
	},
	home: {
		title: "LinkLore",
		subtitle: "小规模学术讨论平台（文档即话题）",
		stats: {
			topics: "话题",
			documents: "文档",
			users: "用户",
			books: "书籍"
		},
		latestTopics: "最新话题"
	},
	topic: {
		title: "话题",
		author: "作者",
		createdAt: "创建于",
		documentCount: "文档数",
		blindReview: "盲评进行中（前 48 小时隐藏作者）",
		anonymous: "匿名",
		originalDocument: "原始文档",
		responseDocuments: "回应文档",
		uploadResponse: "上传回应文档",
		exportZip: "导出话题包 ZIP",
		exportMarkdown: "导出 Markdown",
		downloadOriginal: "下载原始文档"
	},
	upload: {
		title: "发起话题",
		description: "支持：doc, docx, txt, md, pdf, rtf（单文件 ≤ 20MB）",
		uploading: "上传中...",
		success: "上传成功！",
		error: "上传失败"
	},
	auth: {
		signin: "登录",
		signup: "注册",
		signout: "登出",
		email: "邮箱",
		password: "密码",
		inviteCode: "邀请码",
		loginSuccess: "登录成功",
		loginFailed: "登录失败",
		registerSuccess: "注册成功",
		registerFailed: "注册失败"
	},
	ai: {
		title: "我的 AI",
		provider: "提供商",
		model: "模型",
		apiKey: "API Key",
		apiEndpoint: "API 端点",
		testConnection: "测试连通",
		saveConfig: "保存配置",
		usage: "本月用量"
	},
	library: {
		title: "公共图书馆",
		description: "搜索并添加书籍到公共图书馆，或上传电子书文件。所有用户都可以看到。",
		addToShelf: "添加到书架",
		removeFromShelf: "从书架移除",
		readOnline: "在线阅读",
		download: "下载"
	},
	evaluation: {
		title: "AI 评价",
		discipline: "学科",
		structure: "结构",
		logic: "逻辑",
		viewpoint: "观点",
		evidence: "证据",
		citation: "引用",
		generating: "评价生成中，请稍候..."
	},
	consensus: {
		title: "共识分析",
		consensus: "已共识",
		disagreements: "分歧点",
		unverified: "待验证",
		needMoreDocs: "需要至少 2 个文档才能进行共识分析",
		hint: "提示：可以上传多个文档（可以是同一用户）来测试共识分析功能。AI 会自动分析文档中的观点，识别共识点和分歧点。"
	},
	quality: {
		title: "质量信号",
		rigor: "严谨度",
		clarity: "清晰度",
		citationCompleteness: "引用完整度",
		originality: "原创性",
		notRated: "未评"
	},
	theme: {
		toggle: "切换主题",
		light: "浅色",
		dark: "深色"
	}
} as const;










