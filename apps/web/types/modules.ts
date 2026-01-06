// 游戏模块类型定义

import type { QuestionType } from './workshop';
import { 
  ClockIcon, 
  QuestionIcon, 
  GridIcon, 
  SparklesIcon, 
  RepeatIcon,
  ShareIcon,
  ChartIcon,
  ShuffleIcon,
  Volume2Icon,
  AwardIcon,
  TrendingUpIcon,
  UsersIcon
} from '@/components/ui/Icons';

// 模块配置字段定义
export interface ModuleConfigField {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'string' | 'select';
  defaultValue: any;
  options?: Array<{ label: string; value: any }>;
  min?: number;
  max?: number;
  description?: string;
}

// 模块配置架构
export interface ModuleConfigSchema {
  fields: ModuleConfigField[];
}

// 游戏模块定义
export interface GameModule {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'core' | 'display' | 'gameplay' | 'social' | 'enhancement';
  defaultConfig: Record<string, any>;
  configSchema: ModuleConfigSchema;
  compatibleWith?: QuestionType[];  // 兼容的游戏类型
  requiredFor?: QuestionType[];     // 某些游戏类型必须使用
}

// 模块配置（运行时）
export interface ModuleConfig {
  [key: string]: any;
  required?: boolean;  // 是否为必选模块
}

// 所有可用模块
export const AVAILABLE_MODULES: GameModule[] = [
  {
    id: 'display-mode',
    name: '显示模式',
    description: '控制题目展示方式',
    icon: GridIcon,
    category: 'display',
    defaultConfig: {
      enabled: true,
      mode: 'vertical'  // vertical | table | slideshow | grid
    },
    configSchema: {
      fields: [
        {
          key: 'enabled',
          label: '启用',
          type: 'boolean',
          defaultValue: true
        },
        {
          key: 'mode',
          label: '展示模式',
          type: 'select',
          defaultValue: 'vertical',
          options: [
            { label: '垂直排列', value: 'vertical' },
            { label: '表格展示', value: 'table' },
            { label: '幻灯片', value: 'slideshow' },
            { label: '网格', value: 'grid' }
          ]
        }
      ]
    }
  },
  {
    id: 'timer',
    name: '计时器',
    description: '为游戏添加限时功能',
    icon: ClockIcon,
    category: 'gameplay',
    defaultConfig: {
      enabled: true,
      timeLimit: 120,
      showCountdown: true,
      autoSubmit: true
    },
    configSchema: {
      fields: [
        {
          key: 'enabled',
          label: '启用计时',
          type: 'boolean',
          defaultValue: true
        },
        {
          key: 'timeLimit',
          label: '时间限制(秒)',
          type: 'number',
          defaultValue: 120,
          min: 1,
          max: 3600,
          description: '1-3600秒'
        },
        {
          key: 'showCountdown',
          label: '显示倒计时',
          type: 'boolean',
          defaultValue: true
        },
        {
          key: 'autoSubmit',
          label: '时间到自动提交',
          type: 'boolean',
          defaultValue: true
        }
      ]
    }
  },
  {
    id: 'hint',
    name: '提示功能',
    description: '允许玩家查看提示',
    icon: QuestionIcon,
    category: 'gameplay',
    defaultConfig: {
      enabled: false,
      showImmediately: false,
      delaySeconds: 0,
      costPoints: 0
    },
    configSchema: {
      fields: [
        {
          key: 'enabled',
          label: '启用提示',
          type: 'boolean',
          defaultValue: false
        },
        {
          key: 'showImmediately',
          label: '立即显示',
          type: 'boolean',
          defaultValue: false
        },
        {
          key: 'delaySeconds',
          label: '延迟显示(秒)',
          type: 'number',
          defaultValue: 0,
          min: 0,
          max: 300
        }
      ]
    },
      compatibleWith: ['text', 'fill-blank', 'image', 'click']
  },
  {
    id: 'random-order',
    name: '随机顺序',
    description: '随机排列题目和选项顺序',
    icon: ShuffleIcon,
    category: 'enhancement',
    defaultConfig: {
      enabled: true,
      randomizeQuestions: true,
      randomizeOptions: true
    },
    configSchema: {
      fields: [
        {
          key: 'enabled',
          label: '启用随机',
          type: 'boolean',
          defaultValue: true
        },
        {
          key: 'randomizeQuestions',
          label: '题目随机',
          type: 'boolean',
          defaultValue: true
        },
        {
          key: 'randomizeOptions',
          label: '选项随机',
          type: 'boolean',
          defaultValue: true
        }
      ]
    },
    compatibleWith: ['click', 'sort', 'compare', 'categorize']
  },
  {
    id: 'scoring',
    name: '积分系统',
    description: '计算和显示游戏得分',
    icon: SparklesIcon,
    category: 'gameplay',
    defaultConfig: {
      enabled: false,
      correctPoints: 10,
      wrongPoints: -5,
      showScore: true,
      showRank: false
    },
    configSchema: {
      fields: [
        {
          key: 'enabled',
          label: '启用积分',
          type: 'boolean',
          defaultValue: false
        },
        {
          key: 'correctPoints',
          label: '答对得分',
          type: 'number',
          defaultValue: 10,
          min: 1
        },
        {
          key: 'wrongPoints',
          label: '答错扣分',
          type: 'number',
          defaultValue: -5,
          max: 0
        },
        {
          key: 'showScore',
          label: '显示得分',
          type: 'boolean',
          defaultValue: true
        }
      ]
    }
  },
  {
    id: 'max-attempts',
    name: '尝试次数',
    description: '限制玩家答题尝试次数',
    icon: RepeatIcon,
    category: 'gameplay',
    defaultConfig: {
      enabled: false,
      maxAttempts: 3,
      showRemaining: true
    },
    configSchema: {
      fields: [
        {
          key: 'enabled',
          label: '启用限制',
          type: 'boolean',
          defaultValue: false
        },
        {
          key: 'maxAttempts',
          label: '最大尝试次数',
          type: 'number',
          defaultValue: 3,
          min: 1,
          max: 10
        },
        {
          key: 'showRemaining',
          label: '显示剩余次数',
          type: 'boolean',
          defaultValue: true
        }
      ]
    }
  },
  {
    id: 'leaderboard',
    name: '排行榜',
    description: '显示玩家排行榜',
    icon: TrendingUpIcon,
    category: 'social',
    defaultConfig: {
      enabled: false,
      showTopN: 10,
      showAll: false
    },
    configSchema: {
      fields: [
        {
          key: 'enabled',
          label: '启用排行榜',
          type: 'boolean',
          defaultValue: false
        },
        {
          key: 'showTopN',
          label: '显示前N名',
          type: 'number',
          defaultValue: 10,
          min: 1,
          max: 100
        },
        {
          key: 'showAll',
          label: '显示全部',
          type: 'boolean',
          defaultValue: false
        }
      ]
    }
  },
  {
    id: 'share',
    name: '分享功能',
    description: '允许玩家分享游戏',
    icon: ShareIcon,
    category: 'social',
    defaultConfig: {
      enabled: false,
      allowLink: true,
      allowQRCode: true
    },
    configSchema: {
      fields: [
        {
          key: 'enabled',
          label: '启用分享',
          type: 'boolean',
          defaultValue: false
        },
        {
          key: 'allowLink',
          label: '允许链接分享',
          type: 'boolean',
          defaultValue: true
        },
        {
          key: 'allowQRCode',
          label: '允许二维码分享',
          type: 'boolean',
          defaultValue: true
        }
      ]
    }
  }
];

// 游戏类型与默认模块的映射关系
export const GAME_TYPE_DEFAULT_MODULES: Record<string, {
  required: string[];      // 必选模块（不能移除）
  recommended: string[];   // 推荐模块（默认启用，可移除）
  optional: string[];      // 可选模块（默认不启用，可添加）
}> = {
  'text': {
    required: [],
    recommended: ['display-mode', 'timer'],
    optional: ['hint', 'random-order', 'scoring', 'max-attempts', 'leaderboard', 'share']
  },
  'image': {
    required: [],
    recommended: ['display-mode'],
    optional: ['hint', 'timer', 'random-order', 'scoring', 'max-attempts', 'leaderboard']
  },
  'click': {
    required: [],
    recommended: ['display-mode', 'random-order'],
    optional: ['timer', 'hint', 'scoring', 'max-attempts', 'leaderboard']
  },
  'fill-blank': {
    required: [],
    recommended: ['display-mode', 'hint'],
    optional: ['timer', 'random-order', 'scoring', 'max-attempts']
  },
  'sort': {
    required: [],
    recommended: ['display-mode', 'random-order'],
    optional: ['timer', 'hint', 'scoring']
  },
  'categorize': {
    required: [],
    recommended: ['display-mode'],
    optional: ['timer', 'hint', 'random-order', 'scoring']
  },
  'compare': {
    required: [],
    recommended: ['display-mode', 'random-order'],
    optional: ['timer', 'hint', 'scoring']
  },
  'svg-input': {
    required: [],
    recommended: ['display-mode'],
    optional: ['timer', 'hint', 'scoring']
  },
  'minesweeper': {
    required: ['timer'],
    recommended: ['display-mode', 'scoring'],
    optional: ['max-attempts', 'leaderboard']
  },
  'hint': {
    required: ['hint'],
    recommended: ['display-mode'],
    optional: ['timer', 'random-order', 'scoring']
  },
  'challenge': {
    required: ['scoring', 'max-attempts'],
    recommended: ['display-mode', 'timer'],
    optional: ['hint', 'random-order', 'leaderboard', 'share']
  }
};

