'use client';

import { useState, forwardRef, useRef, useImperativeHandle } from 'react';
import FacilitatorPanel, { type FacilitatorPanelRef } from './FacilitatorPanel';

interface FacilitatorSidebarProps {
	roomId: string;
	roomType: 'SOLO' | 'DUO' | null;
	facilitatorMode?: 'v1' | 'v2' | 'v3';
}

export interface FacilitatorSidebarRef {
	requestStructureAnalysis: () => Promise<void>;
	requestConsensusSummary: () => Promise<void>;
	requestToneReminder: () => Promise<void>;
}

const FacilitatorSidebar = forwardRef<FacilitatorSidebarRef, FacilitatorSidebarProps>(
	({ roomId, roomType, facilitatorMode = 'v1' }, ref) => {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const facilitatorPanelRef = useRef<FacilitatorPanelRef>(null);

	// 暴露方法给父组件
	useImperativeHandle(ref, () => ({
		requestStructureAnalysis: async () => {
			await facilitatorPanelRef.current?.requestStructureAnalysis();
		},
		requestConsensusSummary: async () => {
			await facilitatorPanelRef.current?.requestConsensusSummary();
		},
		requestToneReminder: async () => {
			await facilitatorPanelRef.current?.requestToneReminder();
		}
	}));

	// 只在 DUO 房间显示
	if (roomType !== 'DUO') {
		return null;
	}

	const sidebarWidth = isCollapsed ? 0 : 320;

	return (
		<div
			style={{
				width: `${sidebarWidth}px`,
				height: '100vh',
				background: 'var(--color-background-secondary)',
				borderLeft: '1px solid var(--color-border)',
				display: 'flex',
				flexDirection: 'column',
				transition: 'width 0.3s ease',
				overflow: 'hidden',
				position: 'relative'
			}}
		>
			{/* 折叠/展开按钮 */}
			<button
				onClick={() => setIsCollapsed(!isCollapsed)}
				style={{
					position: 'absolute',
					left: isCollapsed ? '0' : '-20px',
					top: '50%',
					transform: 'translateY(-50%)',
					width: '20px',
					height: '60px',
					background: 'var(--color-primary)',
					color: 'white',
					border: 'none',
					borderRadius: isCollapsed ? '0 4px 4px 0' : '4px 0 0 4px',
					cursor: 'pointer',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: '12px',
					zIndex: 10,
					boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
					transition: 'left 0.3s ease'
				}}
				title={isCollapsed ? '展开AI助手' : '折叠AI助手'}
			>
				{isCollapsed ? '▶' : '◀'}
			</button>

			{/* 内容区域 */}
			{!isCollapsed && (
				<>
					{/* 标题栏 */}
					<div
						style={{
							padding: '16px',
							borderBottom: '1px solid var(--color-border)',
							background: 'var(--color-background)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between'
						}}
					>
						<h3
							style={{
								margin: 0,
								fontSize: '16px',
								fontWeight: 600,
								color: 'var(--color-text-primary)'
							}}
						>
							🤖 AI 讨论助手
						</h3>
						<span
							style={{
								fontSize: '12px',
								color: 'var(--color-text-secondary)',
								padding: '2px 8px',
								background: 'var(--color-background-subtle)',
								borderRadius: '4px'
							}}
						>
							{facilitatorMode.toUpperCase()}
						</span>
					</div>

					{/* FacilitatorPanel */}
					<div style={{ flex: 1, overflow: 'hidden' }}>
						<FacilitatorPanel ref={facilitatorPanelRef} roomId={roomId} facilitatorMode={facilitatorMode} />
					</div>
				</>
			)}
		</div>
	);
});

FacilitatorSidebar.displayName = 'FacilitatorSidebar';

export default FacilitatorSidebar;
