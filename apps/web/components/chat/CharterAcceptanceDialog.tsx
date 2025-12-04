'use client';

import { useState } from 'react';

interface CharterAcceptanceDialogProps {
	onAccept: () => void;
	onClose?: () => void; // 取消/关闭回调
	isCreator?: boolean;
	canCancel?: boolean; // 是否可以取消（参与者不能取消，必须同意）
}

/**
 * 宪章同意对话框
 * 显示《双人讨论宪章》内容，用户需要同意后才能开始讨论
 */
export default function CharterAcceptanceDialog({ onAccept, onClose, isCreator = false, canCancel = true }: CharterAcceptanceDialogProps) {
	const [accepted, setAccepted] = useState(false);

	const handleAccept = () => {
		if (accepted) {
			onAccept();
		}
	};

	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: 'rgba(0, 0, 0, 0.5)',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				zIndex: 1000
			}}
			onClick={canCancel && onClose ? onClose : undefined}
		>
			<div
				style={{
					background: 'var(--color-background-paper)',
					borderRadius: '12px',
					padding: '24px',
					maxWidth: '800px',
					width: '90%',
					maxHeight: '80vh',
					overflowY: 'auto',
					boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
					position: 'relative'
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* 关闭按钮（仅当允许取消时显示） */}
				{canCancel && onClose && (
					<button
						type="button"
						onClick={onClose}
						style={{
							position: 'absolute',
							top: '16px',
							right: '16px',
							width: '32px',
							height: '32px',
							padding: 0,
							border: 'none',
							background: 'transparent',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							borderRadius: '6px',
							color: 'var(--color-text-secondary)',
							fontSize: '20px',
							lineHeight: 1
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'var(--color-background-subtle)';
							e.currentTarget.style.color = 'var(--color-text-primary)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'transparent';
							e.currentTarget.style.color = 'var(--color-text-secondary)';
						}}
						title="关闭"
					>
						×
					</button>
				)}
				<h2
					style={{
						fontSize: '20px',
						fontWeight: 600,
						marginBottom: '16px',
						color: 'var(--color-text-primary)',
						paddingRight: onClose ? '40px' : '0'
					}}
				>
					《双人讨论宪章》
				</h2>
				<p
					style={{
						fontSize: '14px',
						color: 'var(--color-text-secondary)',
						marginBottom: '20px',
						lineHeight: '1.5'
					}}
				>
					为了确保讨论能够在明确、理性、基于事实的基础上稳步推进，并以达成可共同接受的共识为核心方向，请仔细阅读以下宪章内容。
				</p>

				<div
					style={{
						background: 'var(--color-background)',
						border: '1px solid var(--color-border)',
						borderRadius: '8px',
						padding: '20px',
						marginBottom: '20px',
						maxHeight: '50vh',
						overflowY: 'auto',
						fontSize: '13px',
						lineHeight: '1.8',
						color: 'var(--color-text-primary)'
					}}
				>
					<div style={{ marginBottom: '16px' }}>
						<h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>第一章：总目标与基本原则</h3>
						<p style={{ marginBottom: '8px' }}>
							<strong>第1条（讨论目的）</strong>：系统内所有讨论以以下目标为最高准则：保持主题聚焦、澄清事实与前提、促进理解与协调、最终达成可共同接受的共识。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第2条（合作精神）</strong>：讨论是一种合作性活动，而非竞争或攻击；所有发言均应以共同探求更清晰的事实、更稳固的逻辑、更合理的结论为目的。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第3条（AI的从属性）</strong>：系统内的AI必须服务于讨论目的，而非主导价值判断或代替用户立场。
						</p>
					</div>

					<div style={{ marginBottom: '16px' }}>
						<h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>第二章：讨论前提与主题管理</h3>
						<p style={{ marginBottom: '8px' }}>
							<strong>第4条（主题明确性）</strong>：讨论必须围绕明确主题进行；当主题未定义、模糊或多重时，监督AI应提示澄清或限定范围。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第5条（主题偏离判定）</strong>：当发言出现与当前核心问题无逻辑关联、引入无根据的旁枝观点、将争论转向他人动机/身份/情绪等非议题内容时，监督AI应判定为主题偏离。
						</p>
					</div>

					<div style={{ marginBottom: '16px' }}>
						<h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>第三章：事实、前提与推理</h3>
						<p style={{ marginBottom: '8px' }}>
							<strong>第6条（事实与假设区分）</strong>：所有论述必须区分"已确认的事实"、"未确认的推测"、"价值判断与个人偏好"。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第7条（前提明确义务）</strong>：提出观点的任何主体必须在必要时说明该观点依赖的前提。若前提未明，监督AI应提示澄清。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第8条（推理链条要求）</strong>：结论必须能溯源至明确的理由与前提；监督AI需确保不存在偷换概念、跳步推理、以偏概全、稻草人论证、情绪替代推理。
						</p>
					</div>

					<div style={{ marginBottom: '16px' }}>
						<h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>第四章：表达方式与情绪管理</h3>
						<p style={{ marginBottom: '8px' }}>
							<strong>第9条（理性表达义务）</strong>：所有发言必须遵守以下规范：观点应清晰、可理解；不得使用侮辱、讽刺、贬低性词汇；不得以情绪表达替代事实或推理；不得使用攻击性假设。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第10条（情绪升级预警）</strong>：当出现指责、归罪、标签化、情绪负荷明显增加、发言目的转为证明对方错误而非推进讨论时，监督AI必须启动"降级模式"。
						</p>
					</div>

					<div style={{ marginBottom: '16px' }}>
						<h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>第五章：分歧处理与共识机制</h3>
						<p style={{ marginBottom: '8px' }}>
							<strong>第11条（分歧拆分原则）</strong>：监督AI必须将混合争议拆分为可处理子问题，包括：事实层分歧、概念定义分歧、推理链分歧、价值取向分歧。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第12条（阶段性共识锁定）</strong>：对双方确认的事实、定义、前提必须被系统记录为"锁定共识"；任何企图推翻锁定共识的发言必须先提供理由。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第13条（可分歧结论原则）</strong>：当价值差异或世界观差异不可协调时，系统允许形成"明确标注的分歧点"，并继续在可达成共识部分推进。
						</p>
					</div>

					<div style={{ marginBottom: '16px' }}>
						<h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>第六章：AI辅助回答规范</h3>
						<p style={{ marginBottom: '8px' }}>
							<strong>第14条（AI不得制造虚假事实）</strong>：AI不得生成虚构事实、编造数据、未标注的不确定推论、带有误导性的模糊权威表达。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第15条（AI不得情绪化）</strong>：AI的语气必须始终保持中立、冷静、建设性。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第16条（AI不得参与价值裁决）</strong>：AI不得对用户谁"更正确"做裁定；只可解释逻辑、校验事实、提供背景、分析结构、澄清概念、提供多种可能观点。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第17条（AI必须促进共识形成）</strong>：每一条AI输出必须符合提高清晰度、降低冲突、增强可理解性、促进问题收敛、不推高争论强度、不传播未经验证的信息。
						</p>
					</div>

					<div style={{ marginBottom: '16px' }}>
						<h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>第七章：监督AI的权限与责任</h3>
						<p style={{ marginBottom: '8px' }}>
							<strong>第18条（监督权）</strong>：监督AI可执行标注逻辑错误、指出主题偏离、拦截不符合宪章的AI回答、降级情绪对话、要求澄清前提、要求结构化表达、协助记录共识点与分歧点。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第19条（公正中立原则）</strong>：监督AI必须保持无立场偏向、无情绪态度、不得协助任何一方"赢得讨论"、不得对用户人格作判断、仅就"表达与逻辑质量"进行监督。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第20条（最低干预原则）</strong>：监督AI的介入应满足必要性（仅在偏离发生时介入）和最小破坏性（不改变双方讨论意图，仅恢复秩序）。
						</p>
					</div>

					<div>
						<h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>第八章：讨论收束与记录</h3>
						<p style={{ marginBottom: '8px' }}>
							<strong>第21条（自动总结机制）</strong>：在讨论接近结束或用户要求时，监督AI必须输出已达成的共识、尚存在的分歧、未解决的关键前提、未来可能讨论方向。
						</p>
						<p style={{ marginBottom: '8px' }}>
							<strong>第22条（讨论追踪一致性）</strong>：监督AI必须确保讨论的结论与先前记录保持一致，不得在无理由情况下发生结构性跳跃。
						</p>
					</div>
				</div>

				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						marginBottom: '20px',
						padding: '12px',
						background: accepted ? 'var(--color-primary-lighter)' : 'var(--color-background-subtle)',
						borderRadius: '8px',
						border: `1px solid ${accepted ? 'var(--color-primary)' : 'var(--color-border)'}`
					}}
				>
					<input
						type="checkbox"
						id="charter-accept"
						checked={accepted}
						onChange={(e) => setAccepted(e.target.checked)}
						style={{
							width: '20px',
							height: '20px',
							marginRight: '12px',
							cursor: 'pointer'
						}}
					/>
					<label
						htmlFor="charter-accept"
						style={{
							fontSize: '14px',
							color: 'var(--color-text-primary)',
							cursor: 'pointer',
							flex: 1
						}}
					>
						我已仔细阅读并同意遵守《双人讨论宪章》的所有条款
					</label>
				</div>

				<div
					style={{
						display: 'flex',
						justifyContent: 'flex-end',
						gap: '12px'
					}}
				>
					{canCancel && onClose && (
						<button
							type="button"
							onClick={onClose}
							style={{
								padding: '10px 24px',
								border: '1px solid var(--color-border)',
								borderRadius: '8px',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
								fontSize: '14px',
								fontWeight: 500,
								cursor: 'pointer',
								transition: 'all 0.2s'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'var(--color-background-subtle)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'var(--color-background)';
							}}
						>
							取消
						</button>
					)}
					<button
						type="button"
						onClick={handleAccept}
						disabled={!accepted}
						style={{
							padding: '10px 24px',
							border: 'none',
							borderRadius: '8px',
							background: !accepted ? 'var(--color-background-subtle)' : 'var(--color-primary)',
							color: !accepted ? 'var(--color-text-secondary)' : 'white',
							fontSize: '14px',
							fontWeight: 500,
							cursor: !accepted ? 'not-allowed' : 'pointer',
							opacity: !accepted ? 0.6 : 1
						}}
					>
						同意并开始讨论
					</button>
				</div>
			</div>
		</div>
	);
}

