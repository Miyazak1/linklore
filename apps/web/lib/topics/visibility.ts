export function isBlindReviewWindow(createdAt: Date) {
	const now = new Date().getTime();
	const start = createdAt.getTime();
	const hours = (now - start) / (1000 * 60 * 60);
	return hours < 48;
}











