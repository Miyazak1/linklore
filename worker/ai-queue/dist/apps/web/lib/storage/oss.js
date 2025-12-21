import OSS from 'ali-oss';
// Check if using local storage (when OSS config is missing)
const USE_LOCAL_STORAGE = !process.env.OSS_REGION || !process.env.OSS_ACCESS_KEY_ID;
export function getOssClient() {
    if (USE_LOCAL_STORAGE) {
        throw new Error('本地模式：使用本地存储，无需 OSS 客户端');
    }
    const region = process.env.OSS_REGION;
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
    const bucket = process.env.OSS_BUCKET;
    if (!region || !accessKeyId || !accessKeySecret || !bucket) {
        throw new Error('OSS 配置缺失');
    }
    return new OSS({ region, accessKeyId, accessKeySecret, bucket, secure: true });
}
export function makeObjectKey(userId, filename) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `uploads/${userId}/${ts}-${safe}`;
}
export function isLocalStorage() {
    return USE_LOCAL_STORAGE;
}
