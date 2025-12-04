'use client';
import { useEffect, useRef, useState } from 'react';

export default function EpubReader({ src }: { src: string }) {
	const viewerRef = useRef<HTMLDivElement>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [book, setBook] = useState<any>(null);
	const [rendition, setRendition] = useState<any>(null);
	const [currentLocation, setCurrentLocation] = useState<any>(null);
	const [isReady, setIsReady] = useState(false);

	// Check if it's a PDF (can be displayed inline)
	const isPdf = src.toLowerCase().includes('.pdf') || src.toLowerCase().includes('pdf');
	
	if (isPdf) {
		return (
			<div style={{ width: '100%', height: '80vh', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
				<iframe
					src={src}
					style={{ width: '100%', height: '100%', border: 'none' }}
					title="PDF Reader"
				/>
			</div>
		);
	}

	// Check if it's EPUB
	const isEpub = src.toLowerCase().includes('.epub') || src.toLowerCase().includes('epub');

	useEffect(() => {
		if (!isEpub || !viewerRef.current) return;

		let mounted = true;

		async function loadEpub() {
			try {
				setLoading(true);
				setError(null);

				// Dynamically import epubjs (client-side only)
				const { default: ePub } = await import('epubjs');
				
				// Create book instance
				// epub.js needs the file URL
				const bookInstance = ePub(src);

				if (!mounted) return;

				setBook(bookInstance);

				// Wait for book to be ready
				await bookInstance.ready;

				if (!mounted) return;

				// Create rendition
				const renditionInstance = bookInstance.renderTo(viewerRef.current!, {
					width: '100%',
					height: '80vh',
					spread: 'none'
				});

				// Display first section
				await renditionInstance.display();

				if (!mounted) return;

				setRendition(renditionInstance);
				setIsReady(true);
				setLoading(false);

				// Track location changes
				renditionInstance.on('relocated', (location: any) => {
					if (mounted) {
						setCurrentLocation(location);
					}
				});
			} catch (err: any) {
				console.error('EPUB loading error:', err);
				if (mounted) {
					setError(err.message || '加载 EPUB 失败');
					setLoading(false);
				}
			}
		}

		loadEpub();

		return () => {
			mounted = false;
			if (rendition) {
				rendition.destroy();
			}
			if (book) {
				book.destroy();
			}
		};
	}, [src, isEpub]);

	const handlePrev = () => {
		if (rendition) {
			rendition.prev();
		}
	};

	const handleNext = () => {
		if (rendition) {
			rendition.next();
		}
	};

	if (!isEpub) {
		// For non-EPUB formats, show download option
		return (
			<div style={{ padding: 48, textAlign: 'center', background: '#f9f9f9', borderRadius: 8 }}>
				<h3 style={{ marginBottom: 16 }}>暂不支持此格式在线阅读</h3>
				<p style={{ color: '#666', marginBottom: 24 }}>
					请下载后使用本地阅读器打开。
				</p>
				<a
					href={src}
					download
					style={{
						display: 'inline-block',
						padding: '12px 24px',
						background: '#1976d2',
						color: '#fff',
						textDecoration: 'none',
						borderRadius: 4,
						fontSize: '1em'
					}}
				>
					下载电子书
				</a>
			</div>
		);
	}

	if (error) {
		return (
			<div style={{ padding: 48, textAlign: 'center', background: '#ffebee', borderRadius: 8 }}>
				<h3 style={{ marginBottom: 16, color: '#c62828' }}>加载失败</h3>
				<p style={{ color: '#666', marginBottom: 24 }}>{error}</p>
				<a
					href={src}
					download
					style={{
						display: 'inline-block',
						padding: '12px 24px',
						background: '#1976d2',
						color: '#fff',
						textDecoration: 'none',
						borderRadius: 4,
						fontSize: '1em'
					}}
				>
					下载电子书
				</a>
			</div>
		);
	}

	return (
		<div style={{ width: '100%' }}>
			{/* Controls */}
			{isReady && (
				<div style={{ 
					display: 'flex', 
					justifyContent: 'space-between', 
					alignItems: 'center',
					padding: '12px 16px',
					background: '#f5f5f5',
					borderRadius: '8px 8px 0 0',
					border: '1px solid #ddd',
					borderBottom: 'none'
				}}>
					<button
						type="button"
						onClick={handlePrev}
						disabled={!rendition}
						style={{
							padding: '8px 16px',
							background: '#1976d2',
							color: '#fff',
							border: 'none',
							borderRadius: 4,
							cursor: 'pointer',
							fontSize: '0.9em'
						}}
					>
						上一页
					</button>
					<span style={{ fontSize: '0.9em', color: '#666' }}>
						{currentLocation?.start?.displayed?.page || 0} / {currentLocation?.end?.displayed?.totalPages || 0}
					</span>
					<button
						type="button"
						onClick={handleNext}
						disabled={!rendition}
						style={{
							padding: '8px 16px',
							background: '#1976d2',
							color: '#fff',
							border: 'none',
							borderRadius: 4,
							cursor: 'pointer',
							fontSize: '0.9em'
						}}
					>
						下一页
					</button>
				</div>
			)}

			{/* EPUB Viewer */}
			<div
				ref={viewerRef}
				style={{
					width: '100%',
					height: '80vh',
					border: '1px solid #ddd',
					borderRadius: isReady ? '0 0 8px 8px' : '8px',
					overflow: 'hidden',
					background: '#fff',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center'
				}}
			>
				{loading && (
					<div style={{ textAlign: 'center', color: '#666' }}>
						<p>加载中...</p>
					</div>
				)}
			</div>

			{/* Download option */}
			<div style={{ marginTop: 16, textAlign: 'center' }}>
				<a
					href={src}
					download
					style={{
						display: 'inline-block',
						padding: '8px 16px',
						background: '#4caf50',
						color: '#fff',
						textDecoration: 'none',
						borderRadius: 4,
						fontSize: '0.9em'
					}}
				>
					下载 EPUB 文件
				</a>
			</div>
		</div>
	);
}


