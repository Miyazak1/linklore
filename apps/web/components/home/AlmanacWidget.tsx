'use client';

import { useState, useEffect } from 'react';

interface AlmanacData {
	date: string; // 公历日期
	lunarDate: string; // 农历日期
	zodiac: string; // 生肖年份
	ganzhi: string; // 天干地支
	suitable: string[]; // 宜
	unsuitable: string[]; // 忌
	clash: string; // 冲煞
	auspicious: string[]; // 吉神
	inauspicious: string[]; // 凶煞
}

/**
 * 黄历吉日组件
 * 显示当日的黄历信息
 */
export default function AlmanacWidget() {
	const [almanacData, setAlmanacData] = useState<AlmanacData | null>(null);
	const [loading, setLoading] = useState(true);

	// 获取今日黄历数据
	useEffect(() => {
		const fetchAlmanacData = async () => {
			try {
				setLoading(true);
				const today = new Date();
				const year = today.getFullYear();
				const month = today.getMonth() + 1;
				const day = today.getDate();
				
				// 调用API获取黄历数据
				const res = await fetch(`/api/almanac?year=${year}&month=${month}&day=${day}`);
				if (res.ok) {
					const data = await res.json();
					if (data.success) {
						setAlmanacData(data.data);
					}
				}
			} catch (err) {
				console.error('[AlmanacWidget] Failed to fetch almanac data:', err);
			} finally {
				setLoading(false);
			}
		};

		fetchAlmanacData();
	}, []);

	const formatDate = () => {
		const today = new Date();
		const year = today.getFullYear();
		const month = today.getMonth() + 1;
		const day = today.getDate();
		const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
		const weekday = weekdays[today.getDay()];
		return `${year}年${month}月${day}日 星期${weekday}`;
	};

	if (loading) {
		return (
			<div className="card-academic" style={{
				padding: 'var(--spacing-xl)',
				marginBottom: 'var(--spacing-xxl)',
				textAlign: 'center'
			}}>
				<p style={{ color: 'var(--color-text-secondary)' }}>加载中...</p>
			</div>
		);
	}

	return (
		<div className="card-academic" style={{
			padding: '24px',
			marginBottom: '40px',
			border: '1px solid rgba(0, 0, 0, 0.08)',
			borderRadius: '12px',
			background: '#FFFFFF'
		}}>
			{/* 标题 */}
			<h2 style={{
				fontSize: '18px',
				fontWeight: 600,
				color: '#2E3038',
				margin: 0,
				marginBottom: '20px'
			}}>
				黄历吉日
			</h2>

			{almanacData ? (
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
					gap: '16px'
				}}>
					{/* 左侧：日期信息 */}
					<div style={{
						padding: '20px',
						background: 'rgba(0, 0, 0, 0.02)',
						borderRadius: '8px',
						border: '1px solid rgba(0, 0, 0, 0.06)'
					}}>
						<div style={{
							fontSize: '56px',
							fontWeight: 700,
							color: '#FF6B6B',
							marginBottom: '12px',
							lineHeight: 1
						}}>
							{new Date().getDate()}
						</div>
						<div style={{
							fontSize: '15px',
							color: '#2E3038',
							marginBottom: '8px',
							fontWeight: 500,
							lineHeight: 1.4
						}}>
							{formatDate()}
						</div>
						<div style={{
							fontSize: '13px',
							color: '#6B6B6B',
							marginBottom: '6px',
							lineHeight: 1.4
						}}>
							{almanacData.lunarDate}
						</div>
						<div style={{
							fontSize: '13px',
							color: '#6B6B6B',
							lineHeight: 1.4
						}}>
							{almanacData.zodiac} {almanacData.ganzhi}
						</div>
					</div>

					{/* 右侧：宜忌信息 */}
					<div style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '12px'
					}}>
						{/* 宜 */}
						<div style={{
							padding: '16px',
							background: 'rgba(76, 175, 80, 0.08)',
							borderRadius: '8px',
							border: '1px solid rgba(76, 175, 80, 0.2)'
						}}>
							<div style={{
								display: 'flex',
								alignItems: 'center',
								gap: '6px',
								marginBottom: '10px'
							}}>
								<span style={{
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									width: '20px',
									height: '20px',
									borderRadius: '50%',
									background: '#4CAF50',
									color: 'white',
									fontSize: '12px',
									fontWeight: 600,
									lineHeight: 1
								}}>
									✓
								</span>
								<span style={{
									fontSize: '14px',
									fontWeight: 600,
									color: '#2E3038',
									lineHeight: 1
								}}>
									适宜
								</span>
							</div>
							<div style={{
								fontSize: '13px',
								color: '#6B6B6B',
								lineHeight: 1.6
							}}>
								{almanacData.suitable.join(' ')}
							</div>
						</div>

						{/* 忌 */}
						<div style={{
							padding: '16px',
							background: 'rgba(244, 67, 54, 0.08)',
							borderRadius: '8px',
							border: '1px solid rgba(244, 67, 54, 0.2)'
						}}>
							<div style={{
								display: 'flex',
								alignItems: 'center',
								gap: '6px',
								marginBottom: '10px'
							}}>
								<span style={{
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									width: '20px',
									height: '20px',
									borderRadius: '50%',
									background: '#F44336',
									color: 'white',
									fontSize: '12px',
									fontWeight: 600,
									lineHeight: 1
								}}>
									✕
								</span>
								<span style={{
									fontSize: '14px',
									fontWeight: 600,
									color: '#2E3038',
									lineHeight: 1
								}}>
									不宜
								</span>
							</div>
							<div style={{
								fontSize: '13px',
								color: '#6B6B6B',
								lineHeight: 1.6
							}}>
								{almanacData.unsuitable.join(' ')}
							</div>
						</div>

						{/* 其他信息 */}
						{(almanacData.clash || almanacData.auspicious.length > 0 || almanacData.inauspicious.length > 0) && (
							<div style={{
								padding: '16px',
								background: 'rgba(0, 0, 0, 0.02)',
								borderRadius: '8px',
								border: '1px solid rgba(0, 0, 0, 0.06)',
								fontSize: '12px',
								color: '#6B6B6B',
								lineHeight: 1.6
							}}>
								{almanacData.clash && (
									<div style={{ marginBottom: '8px' }}>
										<strong style={{ color: '#2E3038', fontWeight: 600 }}>冲煞：</strong>{almanacData.clash}
									</div>
								)}
								{almanacData.auspicious.length > 0 && (
									<div style={{ marginBottom: '8px' }}>
										<strong style={{ color: '#2E3038', fontWeight: 600 }}>吉神：</strong>{almanacData.auspicious.join(' ')}
									</div>
								)}
								{almanacData.inauspicious.length > 0 && (
									<div>
										<strong style={{ color: '#2E3038', fontWeight: 600 }}>凶煞：</strong>{almanacData.inauspicious.join(' ')}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			) : (
				<div style={{
					padding: 'var(--spacing-xl)',
					textAlign: 'center',
					color: 'var(--color-text-secondary)'
				}}>
					暂无黄历数据
				</div>
			)}
		</div>
	);
}

