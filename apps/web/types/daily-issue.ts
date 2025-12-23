// 每日议题思考游戏 - 类型定义

export interface DailyIssue {
	id: string;
	date: string; // YYYYMMDD格式
	title: string;
	caseDescription: string;
	status: 'draft' | 'published' | 'archived';
	difficulty?: number;
	category?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface IssueNode {
	id: string;
	issueId: string;
	stage: number; // 0-5
	nodeKey: string;
	title: string;
	content: string;
	parentNodeKey: string | null;
	nextNodeKeys: string[]; // JSON数组
	isRoot: boolean;
	order: number;
}

export interface PathStep {
	stage: number;
	nodeKey: string;
	selectedAt: string; // ISO timestamp
}

export interface IssuePath {
	id: string;
	issueId: string;
	userId: string | null;
	date: string; // YYYYMMDD格式
	path: PathStep[];
	completedAt: Date | null;
	createdAt: Date;
}

export interface IssueResult {
	id: string;
	issueId: string;
	pathPattern: PathPattern;
	resultTemplate: ResultTemplate;
	createdAt: Date;
	updatedAt: Date;
}

export interface PathPattern {
	stages: number[]; // 必须匹配的阶段
	nodeKeys: string[]; // 必须匹配的节点key（按顺序）
}

export interface ResultTemplate {
	tradeoff: string; // 核心权衡点描述
	alternative: string; // 其他思路提示
	question: string; // 开放式追问
	pathSummary?: string; // 路径回放摘要
}

export interface DecisionTree {
	issue: DailyIssue;
	nodes: Map<string, IssueNode>; // nodeKey -> IssueNode
	rootNode: IssueNode | null;
}

export interface GameState {
	issueId: string;
	currentStage: number;
	currentNodeKey: string | null;
	path: PathStep[];
	isCompleted: boolean;
	startedAt: string;
}

export interface IssueFeedback {
	id: string;
	issueId: string;
	userId: string | null;
	pathId: string | null;
	helpful: boolean | null;
	confusingStage: number | null;
	isNeutral: boolean | null;
	comment: string | null;
	createdAt: Date;
}

export interface IssueAnalytics {
	id: string;
	issueId: string;
	date: string;
	totalAttempts: number;
	completionRate: number;
	pathDistribution: Record<string, number>; // pathKey -> count
	averageTime: number | null;
	createdAt: Date;
	updatedAt: Date;
}





