'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import type { GameModuleConfig, Question, QuestionType } from '@/types/workshop';
import { AVAILABLE_MODULES, GAME_TYPE_DEFAULT_MODULES, type ModuleConfig } from '@/types/modules';
import { ModulePanel } from '@/components/workshop/ModulePanel';
import { styles } from '@/lib/styles/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
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

function CreateGameFormPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAuthenticated } = useAuth();
	
	const selectedType = searchParams.get('type') as QuestionType | null;
	
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
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!selectedType) {
			router.push('/workshop/create');
			return;
		}
		
		// 根据游戏类型初始化默认模块
		const defaultModules = GAME_TYPE_DEFAULT_MODULES[selectedType];
		if (!defaultModules) return;
		
		const initialModules = new Map<string, ModuleConfig>();
		
		// 加载必选模块
		defaultModules.required.forEach(moduleId => {
			const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
			if (module) {
				initialModules.set(moduleId, {
					...module.defaultConfig,
					required: true
				});
			}
		});
		
		// 加载推荐模块（默认启用）
		defaultModules.recommended.forEach(moduleId => {
			const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
			if (module && !initialModules.has(moduleId)) {
				initialModules.set(moduleId, {
					...module.defaultConfig,
					required: false
				});
			}
		});
		
		// 特殊情况：某些模块在某些类型中需要特殊配置
		if (selectedType === 'fill-blank') {
			// 填空题默认启用提示模块
			const hintModule = AVAILABLE_MODULES.find(m => m.id === 'hint');
			if (hintModule && !initialModules.has('hint')) {
				initialModules.set('hint', {
					...hintModule.defaultConfig,
					enabled: true,
					required: false
				});
			}
		}
		
		setEnabledModules(initialModules);
	}, [selectedType, router]);

	if (!isAuthenticated) {
		return (
			<main className="page-container" style={{ textAlign: 'center', maxWidth: 800 }}>
				<p style={{ color: 'var(--color-text-secondary)' }}>
					请先登录以创建游戏
				</p>
			</main>
		);
	}

	if (!selectedType) {
		return null;
	}

	const [uploadingCover, setUploadingCover] = useState(false);

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
						text: '', // 文本类型不需要问题文本
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

			const res = await fetch('/api/workshop/games', {
				method: 'POST',
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
				throw new Error(data.error || '创建失败');
			}

			router.push(`/workshop/${data.game.id}`);
		} catch (err: any) {
			setError(err.message || '创建游戏失败');
		} finally {
			setSaving(false);
		}
	};

	const handleCoverUpload = async (file: File) => {
		if (!file) return;

		// 验证文件类型
		if (!file.type.startsWith('image/')) {
			setError('请上传图片文件');
			return;
		}

		// 验证文件大小（2MB）
		if (file.size > 2 * 1024 * 1024) {
			setError('图片大小不能超过2MB');
			return;
		}

		setUploadingCover(true);
		setError(null);

		try {
			// 创建FormData
			const formData = new FormData();
			formData.append('file', file);

			// 上传到临时位置或直接处理
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
		if (!module) {
			console.error('模块未找到:', moduleId);
			return;
		}
		
		// 检查模块是否已经启用
		if (enabledModules.has(moduleId)) {
			console.warn('模块已经启用:', moduleId);
			return;
		}
		
		const newModules = new Map(enabledModules);
		newModules.set(moduleId, {
			...module.defaultConfig,
			required: false
		});
		console.log('添加模块:', moduleId, '当前已启用模块数:', newModules.size);
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
	
	// 获取可用的模块（未启用的）- 使用 useMemo 优化性能
	const availableModules = useMemo(() => {
		return AVAILABLE_MODULES.filter(module => {
			// 检查是否兼容当前游戏类型
			if (module.compatibleWith && selectedType && !module.compatibleWith.includes(selectedType)) {
				return false;
			}
			// 检查是否已经启用
			if (enabledModules.has(module.id)) {
				return false;
			}
			return true;
		});
	}, [selectedType, enabledModules]);

	return (
		<PageLayout
			title={`创建${getTypeName(selectedType)}测验`}
			subtitle="尽量避免低质or与已有测验重复,测验内容有问题会被打回到草稿或删除"
			backUrl="/workshop/create"
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

export default function CreateGameFormPage() {
	return (
		<Suspense fallback={<LoadingSpinner fullscreen message="加载中..." />}>
			<CreateGameFormPageContent />
		</Suspense>
	);
}