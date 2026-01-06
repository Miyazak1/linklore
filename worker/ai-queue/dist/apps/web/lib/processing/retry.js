import { createModuleLogger } from '@/lib/utils/logger';
const log = createModuleLogger('Retry');
/**
 * 带重试的处理函数（指数退避策略）
 */
export async function processWithRetry(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            // 最后一次尝试，直接抛出错误
            if (attempt === maxRetries - 1) {
                throw err;
            }
            // 指数退避：delay = initialDelay * 2^attempt
            const delay = initialDelay * Math.pow(2, attempt);
            log.warn('Retry attempt failed', { attempt: attempt + 1, delay, error: err.message });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    // 理论上不会到达这里，但 TypeScript 需要
    throw lastError || new Error('Retry failed');
}
