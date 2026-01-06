'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
	GamepadIcon, 
	UploadIcon, 
	PlusIcon, 
	TrashIcon, 
	RocketIcon, 
	ChevronLeftIcon,
	FileIcon
} from '@/components/ui/Icons';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { GameModuleConfig, Question, QuestionType, GameInstance } from '@/types/workshop';
import { AVAILABLE_MODULES, GAME_TYPE_DEFAULT_MODULES, type ModuleConfig } from '@/types/modules';
import { ModulePanel } from '@/components/workshop/ModulePanel';
import { styles } from '@/lib/styles/utils';
import { 
	PageLayout, 
	FormField, 
	QuestionList,
	UploadButton,
	ImagePreview,
	ActionButtons,
	ErrorMessage,
	SubmitButtons
} from '@/components/styles';

export default function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
	const router = useRouter();
	const { user, isAuthenticated } = useAuth();
	const [gameId, setGameId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	
	// 基础信息
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [tags, setTags] = useState<string>('');
	const [coverUrl, setCoverUrl] = useState<string | null>(null);
	const [coverFile, setCoverFile] = useState<File | null>(null);
	
	// 模块系统：Map<moduleId, moduleConfig>
	const [enabledModules, setEnabledModules] = useState<Map<string, ModuleConfig>>(new Map());
	
	// 题目列表
	const [questions, setQuestions] = useState<Array<{ id: string; answer: string; hint?: string }>>([
		{ id: '1', answer: '' }
	]);
	
	const [saving, setSaving] = useState(false);
	const [uploadingCover, setUploadingCover] = useState(false);
	const [selectedType, setSelectedType] = useState<QuestionType | null>(null);

	useEffect(() => {
		params.then(({ id }) => {
			setGameId(id);
		});
	}, [params]);

	// 加载游戏数据
	useEffect(() => {
		if (!gameId || !isAuthenticated) return;
		loadGame();
	}, [gameId, isAuthenticated]);

	// 计算可用模块 - 必须在所有条件返回之前
	const availableModules = useMemo(() => {
		if (!selectedType) return [];
		return AVAILABLE_MODULES.filter(module => {
			if (module.compatibleWith && !module.compatibleWith.includes(selectedType)) {
				return false;
			}
			if (enabledModules.has(module.id)) {
				return false;
			}
			return true;
		});
	}, [selectedType, enabledModules]);

	const loadGame = async () => {
		if (!gameId) return;
		try {
			setLoading(true);
			setError(null);
			const res = await fetch(`/api/workshop/games/${gameId}`);
			const data = await res.json();
			
			if (!res.ok) {
				throw new Error(data.error || '加载失败');
			}
			
			const game: GameInstance = data.game;
			
			// 检查权限
			if (user?.id !== game.authorId) {
				throw new Error('无权编辑此游戏');
			}
			
			// 填充基础信息
			setTitle(game.title);
			setDescription(game.description || '');
			setTags(game.tags.join(', '));
			setCoverUrl(game.coverUrl || null);
			
			// 设置游戏类型
			const gameType = game.modules?.questionTypes?.[0] as QuestionType;
			if (gameType) {
				setSelectedType(gameType);
			}
			
			// 恢复题目列表
			if (Array.isArray(game.questions) && game.questions.length > 0) {
				const restoredQuestions = game.questions.map((q: Question) => ({
					id: q.id,
					answer: Array.isArray(q.content.correctAnswer) 
						? q.content.correctAnswer[0] 
						: q.content.correctAnswer,
					hint: q.content.hint
				}));
				setQuestions(restoredQuestions);
			}
			
			// 恢复模块配置
			if (game.modules) {
				restoreModulesFromGame(game.modules, gameType);
			}
		} catch (err: any) {
			setError(err.message || '加载游戏失败');
		} finally {
			setLoading(false);
		}
	};

	// 从游戏数据恢复模块配置
	const restoreModulesFromGame = (modules: GameModuleConfig, gameType: QuestionType | null) => {
		if (!gameType) return;
		
		const defaultModules = GAME_TYPE_DEFAULT_MODULES[gameType];
		if (!defaultModules) return;
		
		const restoredModules = new Map<string, ModuleConfig>();
		
		// 恢复必选模块
		defaultModules.required.forEach(moduleId => {
			const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
			if (module) {
				restoredModules.set(moduleId, {
					...module.defaultConfig,
					required: true
				});
			}
		});
		
		// 恢复推荐模块
		defaultModules.recommended.forEach(moduleId => {
			const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
			if (module && !restoredModules.has(moduleId)) {
				restoredModules.set(moduleId, {
					...module.defaultConfig,
					required: false
				});
			}
		});
		
		// 根据游戏保存的模块配置恢复状态
		if (modules.displayMode) {
			const displayModule = restoredModules.get('display-mode');
			if (displayModule) {
				restoredModules.set('display-mode', {
					...displayModule,
					mode: modules.displayMode
				});
			}
		}
		
		if (modules.settings) {
			// 恢复计时器
			if (modules.settings.timeLimit !== undefined) {
				const timerModule = restoredModules.get('timer') || AVAILABLE_MODULES.find(m => m.id === 'timer');
				if (timerModule) {
					restoredModules.set('timer', {
						...timerModule.defaultConfig,
						enabled: true,
						timeLimit: modules.settings.timeLimit
					});
				}
			}
			
			// 恢复提示
			if (modules.settings.allowHints) {
				const hintModule = restoredModules.get('hint') || AVAILABLE_MODULES.find(m => m.id === 'hint');
				if (hintModule) {
					restoredModules.set('hint', {
						...hintModule.defaultConfig,
						enabled: true
					});
				}
			}
			
			// 恢复尝试次数
			if (modules.settings.maxAttempts !== undefined) {
				const maxAttemptsModule = restoredModules.get('max-attempts') || AVAILABLE_MODULES.find(m => m.id === 'max-attempts');
				if (maxAttemptsModule) {
					restoredModules.set('max-attempts', {
						...maxAttemptsModule.defaultConfig,
						enabled: true,
						maxAttempts: modules.settings.maxAttempts
					});
				}
			}
		}
		
		// 恢复功能模块
		if (modules.features) {
			modules.features.forEach(feature => {
				if (feature === 'timer' && !restoredModules.has('timer')) {
					const timerModule = AVAILABLE_MODULES.find(m => m.id === 'timer');
					if (timerModule) {
						restoredModules.set('timer', timerModule.defaultConfig);
					}
				}
				if (feature === 'hint' && !restoredModules.has('hint')) {
					const hintModule = AVAILABLE_MODULES.find(m => m.id === 'hint');
					if (hintModule) {
						restoredModules.set('hint', hintModule.defaultConfig);
					}
				}
			});
		}
		
		setEnabledModules(restoredModules);
	};

	if (!isAuthenticated) {
		return (
			<main className="page-container" style={{ textAlign: 'center', maxWidth: 800 }}>
				<p style={{ color: 'var(--color-text-secondary)' }}>
					请先登录以编辑游戏
				</p>
			</main>
		);
	}

	if (loading) {
		return <LoadingSpinner fullscreen message="加载中..." />;
	}

	if (error || !selectedType) {
		return (
			<main className="page-container" style={{ textAlign: 'center', maxWidth: 1200 }}>
				<p style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-lg)' }}>
					{error || '游戏不存在'}
				</p>
				<button
					onClick={() => router.push('/workshop')}
					className="btn-academic"
				>
					返回游戏工坊
				</button>
			</main>
		);
	}

	const getTypeName = (type: string) => {
		const typeMap: Record<string, string> = {
			'text': '文本',
			'image': '图片',
			'click': '点选',
			'fill-blank': '填空',
			'sort': '排序',
			'categorize': '分类',
			'compare': '比较',
			'svg-input': 'SVG输入'
		};
		return typeMap[type] || '游戏';
	};

	const handleSubmit = async (isDraft: boolean) => {
		setError(null);

		if (!title.trim()) {
			setError('请输入标题');
			return;
		}

		if (questions.length === 0 || questions.every(q => !q.answer.trim())) {
			setError('请至少添加一道题目');
			return;
		}

		setSaving(true);

		try {
			// 处理标签
			const tagList = tags.split(',').map(t => t.trim()).filter(t => t);

			// 构建题目数据
			const questionList: Question[] = questions
				.filter(q => q.answer.trim())
				.map((q, idx) => ({
					id: q.id,
					type: selectedType!,
					order: idx + 1,
					content: {
						text: '',
						correctAnswer: q.answer.trim(),
						hint: enabledModules.get('hint')?.enabled && q.hint ? q.hint.trim() : undefined
					}
				}));

			// 从模块配置中提取设置
			const displayModeModule = enabledModules.get('display-mode');
			const timerModule = enabledModules.get('timer');
			const hintModule = enabledModules.get('hint');
			const scoringModule = enabledModules.get('scoring');
			const maxAttemptsModule = enabledModules.get('max-attempts');
			const randomOrderModule = enabledModules.get('random-order');
			
			// 构建模块配置
			const modules: GameModuleConfig = {
				questionTypes: [selectedType!],
				displayMode: displayModeModule?.mode || 'vertical',
				features: [
					...(timerModule?.enabled ? ['timer' as const] : []),
					...(hintModule?.enabled ? ['hint' as const] : []),
					...(randomOrderModule?.enabled ? ['ordered' as const] : [])
				],
				rules: [
					...(maxAttemptsModule?.enabled ? ['challenge' as const] : []),
					...(scoringModule?.enabled ? ['score-based' as const] : [])
				],
				settings: {
					timeLimit: timerModule?.enabled ? timerModule.timeLimit : undefined,
					allowHints: hintModule?.enabled || false,
					showOrder: !randomOrderModule?.enabled,
					maxAttempts: maxAttemptsModule?.enabled ? maxAttemptsModule.maxAttempts : undefined
				}
			};

			// 使用 PUT 更新游戏
			const res = await fetch(`/api/workshop/games/${gameId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					description: description.trim() || null,
					coverUrl,
					tags: tagList,
					modules,
					questions: questionList,
					status: isDraft ? 'draft' : 'published',
					isPublic: true,
					difficulty: undefined
				})
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || '更新失败');
			}

			router.push(`/workshop/${gameId}/play`);
		} catch (err: any) {
			setError(err.message || '更新游戏失败');
		} finally {
			setSaving(false);
		}
	};

	const handleCoverUpload = async (file: File) => {
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			setError('请上传图片文件');
			return;
		}

		if (file.size > 2 * 1024 * 1024) {
			setError('图片大小不能超过2MB');
			return;
		}

		setUploadingCover(true);
		setError(null);

		try {
			const formData = new FormData();
			formData.append('file', file);

			const res = await fetch('/api/workshop/cover/upload', {
				method: 'POST',
				body: formData
			});

			if (!res.ok) {
				throw new Error('上传失败');
			}

			const data = await res.json();
			setCoverUrl(data.url);
			setCoverFile(file);
		} catch (err: any) {
			setError(err.message || '封面上传失败');
		} finally {
			setUploadingCover(false);
		}
	};

	// 模块管理函数
	const handleAddModule = (moduleId: string) => {
		const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
		if (!module) return;
		
		if (enabledModules.has(moduleId)) return;
		
		const newModules = new Map(enabledModules);
		newModules.set(moduleId, {
			...module.defaultConfig,
			required: false
		});
		setEnabledModules(newModules);
	};
	
	const handleRemoveModule = (moduleId: string) => {
		const module = enabledModules.get(moduleId);
		if (module?.required) {
			alert('此模块是该游戏类型的必选模块，无法移除');
			return;
		}
		
		const newModules = new Map(enabledModules);
		newModules.delete(moduleId);
		setEnabledModules(newModules);
	};
	
	const handleUpdateModuleConfig = (moduleId: string, config: ModuleConfig) => {
		const newModules = new Map(enabledModules);
		const currentModule = newModules.get(moduleId);
		if (currentModule) {
			newModules.set(moduleId, {
				...currentModule,
				...config
			});
		}
		setEnabledModules(newModules);
	};

	return (
		<PageLayout
			title={`编辑${getTypeName(selectedType)}测验`}
			subtitle="修改游戏内容后保存"
			backUrl={`/workshop/${gameId}/play`}
			rightPanel={
				selectedType ? (
					<ModulePanel
						enabledModules={enabledModules}
						selectedGameType={selectedType}
						onAddModule={handleAddModule}
						onRemoveModule={handleRemoveModule}
						onUpdateConfig={handleUpdateModuleConfig}
						availableModules={availableModules}
					/>
				) : undefined
			}
		>

			{/* 表单容器 */}
			<div className="form-container">
				<form onSubmit={(e) => e.preventDefault()}>
					<div className="form-field-group">
						{/* 添加封面 */}
						<FormField
							label="添加封面 (选填)"
							hint="如果未设置,则会使用默认封面,建议设置,大家点击和精选推荐的几率更高"
						>
							<UploadButton
								uploading={uploadingCover}
								onChange={handleCoverUpload}
								accept="image/*"
								label="点击上传"
								maxSize={2 * 1024 * 1024}
								onSizeError={() => setError('图片大小不能超过2MB')}
								onTypeError={() => setError('请上传图片文件')}
							/>
							{coverUrl && (
								<ImagePreview
									src={coverUrl}
									alt="封面预览"
									onDelete={() => {
										setCoverUrl(null);
										setCoverFile(null);
									}}
								/>
							)}
						</FormField>

						{/* 标题 */}
						<FormField label="标题" required>
							<input
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="请输入标题"
								required
								className="form-input"
							/>
						</FormField>

						{/* 描述 */}
						<FormField label="描述 (选填)">
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="请简单描述以及介绍数据出处"
								rows={3}
								className="form-textarea"
							/>
						</FormField>

						{/* 标签 */}
						<FormField label="标签 (选填,多标签请用逗号分割)">
							<input
								type="text"
								value={tags}
								onChange={(e) => setTags(e.target.value)}
								placeholder="建议填写,其他用户更容易索引和推荐到。"
								className="form-input"
							/>
						</FormField>

						{/* 问题/答案 */}
						<div>
							<FormField
								label="问题/答案:"
								hint="多个答案可用/符号分割,答案展示中只会展示第一个"
							>
								<QuestionList
									questions={questions}
									onChange={(idx, field, value) => {
										const newQuestions = [...questions];
										if (field === 'answer') {
											newQuestions[idx].answer = value;
										} else {
											newQuestions[idx].hint = value;
										}
										setQuestions(newQuestions);
									}}
									showHints={enabledModules.get('hint')?.enabled || false}
								/>
							</FormField>
							
							{/* 操作按钮 */}
							<ActionButtons
								style={{ marginTop: 'var(--spacing-md)' }}
								buttons={[
									{
										label: '加一题',
										onClick: () => {
											setQuestions([...questions, { id: Date.now().toString(), answer: '' }]);
										}
									},
									{
										label: '删除最后一题',
										onClick: () => {
											if (questions.length > 1) {
												setQuestions(questions.slice(0, -1));
											}
										},
										disabled: questions.length <= 1
									},
									{
										label: '打乱顺序',
										onClick: () => {
											const shuffled = [...questions].sort(() => Math.random() - 0.5);
											setQuestions(shuffled);
										},
										disabled: questions.length <= 1
									},
									{
										label: '文本导出',
										onClick: () => {
											const text = questions.map(q => q.answer).join('\n');
											const blob = new Blob([text], { type: 'text/plain' });
											const url = URL.createObjectURL(blob);
											const a = document.createElement('a');
											a.href = url;
											a.download = 'questions.txt';
											a.click();
											URL.revokeObjectURL(url);
										}
									},
									{
										label: '文本导入',
										onClick: () => {
											const input = document.createElement('input');
											input.type = 'file';
											input.accept = 'text/plain';
											input.onchange = (e) => {
												const file = (e.target as HTMLInputElement).files?.[0];
												if (file) {
													const reader = new FileReader();
													reader.onload = (event) => {
														const text = event.target?.result as string;
														const answers = text.split('\n').filter(line => line.trim());
														setQuestions(answers.map((answer, idx) => ({
															id: Date.now().toString() + idx,
															answer: answer.trim()
														})));
													};
													reader.readAsText(file);
												}
											};
											input.click();
										}
									},
									{
										label: '清空全部',
										onClick: () => {
											if (confirm('确定要清空所有题目吗？')) {
												setQuestions([{ id: '1', answer: '' }]);
											}
										},
										variant: 'danger'
									}
								]}
							/>
						</div>
					</div>

					{/* 错误提示 */}
					<ErrorMessage
						message={error || ''}
						type="error"
						visible={!!error}
						onClose={() => setError(null)}
					/>

					{/* 提交按钮 */}
					<SubmitButtons
						buttons={[
							{
								label: '保存草稿',
								onClick: async () => {
									await handleSubmit(true);
								},
								loading: saving,
								disabled: saving
							},
							{
								label: '提交',
								onClick: async () => {
									await handleSubmit(false);
								},
								variant: 'primary',
								loading: saving,
								disabled: saving,
								icon: <RocketIcon size={18} color="currentColor" />
							}
						]}
					/>
				</form>
			</div>
		</PageLayout>
	);
}

