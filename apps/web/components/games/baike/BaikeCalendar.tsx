'use client';

import { useState, useEffect, useMemo } from 'react';

interface BaikeCalendarProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectDate: (date: string) => void; // date format: YYYYMMDD
	availableDates: string[]; // 有题目的日期列表
	currentDate: string; // 当前选中的日期
}

export default function BaikeCalendar({
	isOpen,
	onClose,
	onSelectDate,
	availableDates,
	currentDate
}: BaikeCalendarProps) {
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
	const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

	// 将 availableDates 转换为 Set 以便快速查找
	const availableDatesSet = useMemo(() => new Set(availableDates), [availableDates]);

	// 切换月份
	const handlePrevMonth = () => {
		if (selectedMonth === 1) {
			setSelectedMonth(12);
			setSelectedYear(selectedYear - 1);
		} else {
			setSelectedMonth(selectedMonth - 1);
		}
	};

	const handleNextMonth = () => {
		if (selectedMonth === 12) {
			setSelectedMonth(1);
			setSelectedYear(selectedYear + 1);
		} else {
			setSelectedMonth(selectedMonth + 1);
		}
	};

	// 切换年份
	const handlePrevYear = () => {
		setSelectedYear(selectedYear - 1);
	};

	const handleNextYear = () => {
		setSelectedYear(selectedYear + 1);
	};

	// 生成日历数据
	const calendarData = useMemo(() => {
		const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
		const lastDay = new Date(selectedYear, selectedMonth, 0);
		const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, ...
		const daysInMonth = lastDay.getDate();

		// 计算上个月的最后几天
		const prevMonthLastDay = new Date(selectedYear, selectedMonth - 1, 0).getDate();
		const prevMonthDays: number[] = [];
		for (let i = firstDayOfWeek - 1; i >= 0; i--) {
			prevMonthDays.push(prevMonthLastDay - i);
		}

		// 当前月的天数
		const currentMonthDays: number[] = [];
		for (let i = 1; i <= daysInMonth; i++) {
			currentMonthDays.push(i);
		}

		// 下个月的前几天（填满6行）
		const totalCells = prevMonthDays.length + currentMonthDays.length;
		const nextMonthDays: number[] = [];
		const remainingCells = 42 - totalCells; // 6行 * 7列 = 42
		for (let i = 1; i <= remainingCells; i++) {
			nextMonthDays.push(i);
		}

		return {
			prevMonthDays,
			currentMonthDays,
			nextMonthDays
		};
	}, [selectedYear, selectedMonth]);

	// 格式化日期为 YYYYMMDD
	const formatDate = (year: number, month: number, day: number): string => {
		return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
	};

	// 检查日期是否有题目
	const hasQuestion = (year: number, month: number, day: number): boolean => {
		const dateStr = formatDate(year, month, day);
		return availableDatesSet.has(dateStr);
	};

	// 检查日期是否是今天
	const isToday = (year: number, month: number, day: number): boolean => {
		const today = new Date();
		return (
			year === today.getFullYear() &&
			month === today.getMonth() + 1 &&
			day === today.getDate()
		);
	};

	// 检查日期是否被选中
	const isSelected = (year: number, month: number, day: number): boolean => {
		const dateStr = formatDate(year, month, day);
		return dateStr === currentDate;
	};

	// 处理日期点击
	const handleDateClick = (e: React.MouseEvent, year: number, month: number, day: number) => {
		e.preventDefault();
		e.stopPropagation();
		e.nativeEvent.stopImmediatePropagation();
		const dateStr = formatDate(year, month, day);
		if (hasQuestion(year, month, day)) {
			// 先关闭弹窗，避免路由变化导致的状态冲突
			onClose();
			// 然后选择日期（这会触发路由变化和页面重新加载）
			onSelectDate(dateStr);
		}
	};

	// 星期标题
	const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

	// 当 currentDate 变化时，更新选中的年月
	useEffect(() => {
		if (currentDate && currentDate.length === 8) {
			const year = parseInt(currentDate.substring(0, 4), 10);
			const month = parseInt(currentDate.substring(4, 6), 10);
			setSelectedYear(year);
			setSelectedMonth(month);
		}
	}, [currentDate]);

	if (!isOpen) return null;

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 10000,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '16px',
				background: 'rgba(0, 0, 0, 0.4)',
				backdropFilter: 'blur(8px)'
			}}
			onMouseDown={(e) => {
				// 只有当点击的是背景层本身时才关闭（不是子元素）
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				style={{
					background: 'var(--color-background-paper)',
					borderRadius: 'var(--radius-lg)',
					boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
					maxWidth: '400px',
					width: '100%',
					padding: '24px',
					position: 'relative'
				}}
				onMouseDown={(e) => e.stopPropagation()}
				onClick={(e) => e.stopPropagation()}
				onMouseUp={(e) => e.stopPropagation()}
			>
				{/* 关闭按钮 */}
				<button
					onClick={onClose}
					style={{
						position: 'absolute',
						top: '16px',
						right: '16px',
						background: 'none',
						border: 'none',
						fontSize: '20px',
						cursor: 'pointer',
						color: 'var(--color-text-secondary)',
						width: '32px',
						height: '32px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						borderRadius: '4px',
						transition: 'background 0.2s'
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = 'var(--color-background-subtle)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = 'none';
					}}
				>
					×
				</button>

				{/* 标题 */}
				<h2 style={{
					margin: '0 0 20px 0',
					fontSize: '18px',
					fontWeight: 600,
					color: 'var(--color-text-primary)'
				}}>
					「百科」回溯
				</h2>

				{/* 年月选择 */}
				<div 
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: '20px',
						gap: '12px'
					}}
					onClick={(e) => e.stopPropagation()}
					onMouseDown={(e) => e.stopPropagation()}
				>
					{/* 年份切换 */}
					<div style={{
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
						flex: 1
					}}>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handlePrevYear();
							}}
							onMouseDown={(e) => e.stopPropagation()}
							style={{
								padding: '6px 10px',
								border: '1px solid rgba(0, 0, 0, 0.1)',
								borderRadius: '6px',
								background: '#FFFFFF',
								color: '#2E3038',
								cursor: 'pointer',
								fontSize: '14px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								transition: 'all 0.2s',
								minWidth: '36px'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
								e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.15)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = '#FFFFFF';
								e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
							}}
						>
							‹
						</button>
						<div style={{
							fontSize: '15px',
							fontWeight: 500,
							color: '#2E3038',
							minWidth: '60px',
							textAlign: 'center'
						}}>
							{selectedYear}年
						</div>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleNextYear();
							}}
							onMouseDown={(e) => e.stopPropagation()}
							style={{
								padding: '6px 10px',
								border: '1px solid rgba(0, 0, 0, 0.1)',
								borderRadius: '6px',
								background: '#FFFFFF',
								color: '#2E3038',
								cursor: 'pointer',
								fontSize: '14px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								transition: 'all 0.2s',
								minWidth: '36px'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
								e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.15)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = '#FFFFFF';
								e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
							}}
						>
							›
						</button>
					</div>

					{/* 月份切换 */}
					<div style={{
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
						flex: 1,
						justifyContent: 'flex-end'
					}}>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handlePrevMonth();
							}}
							onMouseDown={(e) => e.stopPropagation()}
							style={{
								padding: '6px 10px',
								border: '1px solid rgba(0, 0, 0, 0.1)',
								borderRadius: '6px',
								background: '#FFFFFF',
								color: '#2E3038',
								cursor: 'pointer',
								fontSize: '14px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								transition: 'all 0.2s',
								minWidth: '36px'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
								e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.15)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = '#FFFFFF';
								e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
							}}
						>
							‹
						</button>
						<div style={{
							fontSize: '15px',
							fontWeight: 500,
							color: '#2E3038',
							minWidth: '50px',
							textAlign: 'center'
						}}>
							{selectedMonth}月
						</div>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleNextMonth();
							}}
							onMouseDown={(e) => e.stopPropagation()}
							style={{
								padding: '6px 10px',
								border: '1px solid rgba(0, 0, 0, 0.1)',
								borderRadius: '6px',
								background: '#FFFFFF',
								color: '#2E3038',
								cursor: 'pointer',
								fontSize: '14px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								transition: 'all 0.2s',
								minWidth: '36px'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
								e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.15)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = '#FFFFFF';
								e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
							}}
						>
							›
						</button>
					</div>
				</div>

				{/* 星期标题 */}
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(7, 1fr)',
					gap: '4px',
					marginBottom: '8px'
				}}>
					{weekDays.map(day => (
						<div
							key={day}
							style={{
								textAlign: 'center',
								fontSize: '13px',
								color: 'var(--color-text-secondary)',
								fontWeight: 500,
								padding: '8px 0'
							}}
						>
							{day}
						</div>
					))}
				</div>

				{/* 日历网格 */}
				<div 
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(7, 1fr)',
						gap: '4px'
					}}
					onMouseDown={(e) => e.stopPropagation()}
					onClick={(e) => e.stopPropagation()}
				>
					{/* 上个月的日期 */}
					{calendarData.prevMonthDays.map(day => {
						const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
						const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
						const dateStr = formatDate(prevYear, prevMonth, day);
						const hasQ = availableDatesSet.has(dateStr);
						const isSel = dateStr === currentDate;

						return (
							<button
								key={`prev-${day}`}
								type="button"
								onClick={(e) => handleDateClick(e, prevYear, prevMonth, day)}
								onMouseDown={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
								onMouseUp={(e) => e.stopPropagation()}
								disabled={!hasQ}
								style={{
									padding: '8px',
									border: 'none',
									background: isSel
										? 'var(--color-primary)'
										: hasQ
										? 'var(--color-background-subtle)'
										: 'transparent',
									color: isSel
										? 'white'
										: hasQ
										? 'var(--color-text-primary)'
										: 'var(--color-text-tertiary)',
									borderRadius: 'var(--radius-sm)',
									cursor: hasQ ? 'pointer' : 'not-allowed',
									fontSize: '14px',
									position: 'relative',
									transition: 'all 0.2s',
									opacity: hasQ ? 1 : 0.4
								}}
								onMouseEnter={(e) => {
									if (hasQ) {
										e.currentTarget.style.background = isSel
											? 'var(--color-primary-dark)'
											: 'var(--color-background)';
									}
								}}
								onMouseLeave={(e) => {
									if (hasQ) {
										e.currentTarget.style.background = isSel
											? 'var(--color-primary)'
											: 'var(--color-background-subtle)';
									}
								}}
							>
								{day}
								{hasQ && (
									<span style={{
										position: 'absolute',
										top: '2px',
										right: '4px',
										fontSize: '10px',
										color: isSel ? 'white' : 'var(--color-primary)'
									}}>
										✓
									</span>
								)}
							</button>
						);
					})}

					{/* 当前月的日期 */}
					{calendarData.currentMonthDays.map(day => {
						const hasQ = hasQuestion(selectedYear, selectedMonth, day);
						const isSel = isSelected(selectedYear, selectedMonth, day);
						const isTodayDate = isToday(selectedYear, selectedMonth, day);

						return (
							<button
								key={`current-${day}`}
								type="button"
								onClick={(e) => handleDateClick(e, selectedYear, selectedMonth, day)}
								onMouseDown={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
								onMouseUp={(e) => e.stopPropagation()}
								disabled={!hasQ}
								style={{
									padding: '8px',
									border: isTodayDate ? '2px solid var(--color-primary)' : 'none',
									background: isSel
										? 'var(--color-primary)'
										: hasQ
										? 'var(--color-background-subtle)'
										: 'transparent',
									color: isSel
										? 'white'
										: hasQ
										? 'var(--color-text-primary)'
										: 'var(--color-text-tertiary)',
									borderRadius: 'var(--radius-sm)',
									cursor: hasQ ? 'pointer' : 'not-allowed',
									fontSize: '14px',
									fontWeight: isTodayDate ? 600 : 400,
									position: 'relative',
									transition: 'all 0.2s',
									opacity: hasQ ? 1 : 0.4
								}}
								onMouseEnter={(e) => {
									if (hasQ) {
										e.currentTarget.style.background = isSel
											? 'var(--color-primary-dark)'
											: 'var(--color-background)';
									}
								}}
								onMouseLeave={(e) => {
									if (hasQ) {
										e.currentTarget.style.background = isSel
											? 'var(--color-primary)'
											: 'var(--color-background-subtle)';
									}
								}}
							>
								{day}
								{hasQ && (
									<span style={{
										position: 'absolute',
										top: '2px',
										right: '4px',
										fontSize: '10px',
										color: isSel ? 'white' : 'var(--color-primary)'
									}}>
										✓
									</span>
								)}
							</button>
						);
					})}

					{/* 下个月的日期 */}
					{calendarData.nextMonthDays.map(day => {
						const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
						const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
						const dateStr = formatDate(nextYear, nextMonth, day);
						const hasQ = availableDatesSet.has(dateStr);
						const isSel = dateStr === currentDate;

						return (
							<button
								key={`next-${day}`}
								type="button"
								onClick={(e) => handleDateClick(e, nextYear, nextMonth, day)}
								onMouseDown={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
								onMouseUp={(e) => e.stopPropagation()}
								disabled={!hasQ}
								style={{
									padding: '8px',
									border: 'none',
									background: isSel
										? 'var(--color-primary)'
										: hasQ
										? 'var(--color-background-subtle)'
										: 'transparent',
									color: isSel
										? 'white'
										: hasQ
										? 'var(--color-text-primary)'
										: 'var(--color-text-tertiary)',
									borderRadius: 'var(--radius-sm)',
									cursor: hasQ ? 'pointer' : 'not-allowed',
									fontSize: '14px',
									position: 'relative',
									transition: 'all 0.2s',
									opacity: hasQ ? 1 : 0.4
								}}
								onMouseEnter={(e) => {
									if (hasQ) {
										e.currentTarget.style.background = isSel
											? 'var(--color-primary-dark)'
											: 'var(--color-background)';
									}
								}}
								onMouseLeave={(e) => {
									if (hasQ) {
										e.currentTarget.style.background = isSel
											? 'var(--color-primary)'
											: 'var(--color-background-subtle)';
									}
								}}
							>
								{day}
								{hasQ && (
									<span style={{
										position: 'absolute',
										top: '2px',
										right: '4px',
										fontSize: '10px',
										color: isSel ? 'white' : 'var(--color-primary)'
									}}>
										✓
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

