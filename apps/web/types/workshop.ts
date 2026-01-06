// 游戏工坊类型定义

// 问题类型
export type QuestionType = 
  | 'text'           // 文本问答
  | 'image'          // 图片问答
  | 'click'          // 点选
  | 'fill-blank'     // 填空
  | 'sort'           // 排序
  | 'categorize'     // 分类
  | 'compare'        // 比较
  | 'svg-input';     // SVG输入

// 展示模式
export type DisplayMode = 
  | 'vertical'       // 垂直排列
  | 'table'          // 表格
  | 'slideshow'      // 幻灯片
  | 'grid';          // 网格

// 游戏功能
export type GameFeature = 
  | 'hint'           // 提示
  | 'timer'          // 限时
  | 'ordered'        // 顺序展示
  | 'batch-upload';  // 批量上传

// 游戏规则
export type GameRule = 
  | 'challenge'      // 闯关模式（连续答题）
  | 'score-based'    // 积分制
  | 'star-rating'    // 星级评价
  | 'daily-challenge'; // 每日挑战

// 游戏模块配置
export interface GameModuleConfig {
  questionTypes: QuestionType[];  // 可用的题目类型
  displayMode: DisplayMode;       // 展示方式
  features: GameFeature[];        // 启用的功能
  rules: GameRule[];              // 游戏规则
  settings: {
    timeLimit?: number;           // 限时（秒）
    allowHints?: boolean;         // 允许提示
    showOrder?: boolean;          // 显示顺序
    maxAttempts?: number;         // 最大尝试次数
  };
}

// 题目内容
export interface QuestionContent {
  text?: string;                  // 文本内容
  imageUrl?: string;              // 图片URL
  audioUrl?: string;              // 音频URL
  options?: string[];             // 选项（用于点选、排序等）
  correctAnswer: string | string[]; // 正确答案
  hint?: string;                  // 提示
}

// 题目数据结构
export interface Question {
  id: string;
  type: QuestionType;
  content: QuestionContent;
  order: number;
}

// 游戏实例类型（客户端）
export interface GameInstance {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  tags: string[];
  modules: GameModuleConfig;
  questions: Question[];
  status: 'draft' | 'published' | 'archived';
  isPublic: boolean;
  difficulty?: number;
  authorId: string;
  author: {
    email: string;
    name?: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    plays: number;
  };
}



