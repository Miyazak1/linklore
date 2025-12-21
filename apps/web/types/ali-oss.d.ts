declare module 'ali-oss' {
	export interface OSSOptions {
		accessKeyId: string;
		accessKeySecret: string;
		bucket: string;
		region: string;
		endpoint?: string;
		internal?: boolean;
		secure?: boolean;
		timeout?: number;
		cname?: boolean;
		domain?: string;
		stsToken?: string;
		refreshSTSToken?: () => Promise<{ accessKeyId: string; accessKeySecret: string; stsToken: string }>;
		refreshSTSTokenInterval?: number;
		useFetch?: boolean;
		useFetchOptions?: any;
		useCustomDomain?: boolean;
		requestId?: string;
		userAgent?: string;
		proxy?: string;
		agent?: any;
		[key: string]: any;
	}

	export interface PutObjectOptions {
		headers?: { [key: string]: string };
		meta?: { [key: string]: string };
		mime?: string;
		callback?: any;
		contentType?: string;
		contentDisposition?: string;
		cacheControl?: string;
		contentEncoding?: string;
		expires?: string | number;
		serverSideEncryption?: string;
		serverSideDataEncryption?: string;
		serverSideEncryptionKeyId?: string;
		objectAcl?: string;
		timeout?: number;
		[key: string]: any;
	}

	export interface PutObjectResult {
		name: string;
		url: string;
		res: {
			status: number;
			statusCode: number;
			headers: { [key: string]: string };
			size: number;
			rt: number;
		};
	}

	export interface GetObjectOptions {
		headers?: { [key: string]: string };
		timeout?: number;
		process?: string;
		[key: string]: any;
	}

	export interface GetObjectResult {
		content?: Buffer;
		res: {
			status: number;
			statusCode: number;
			headers: { [key: string]: string };
			size: number;
			rt: number;
		};
	}

	export interface HeadObjectOptions {
		headers?: { [key: string]: string };
		timeout?: number;
		[key: string]: any;
	}

	export interface HeadObjectResult {
		res: {
			status: number;
			statusCode: number;
			headers: { [key: string]: string };
			size: number;
			rt: number;
		};
		meta?: { [key: string]: string };
	}

	export interface DeleteObjectOptions {
		headers?: { [key: string]: string };
		timeout?: number;
		[key: string]: any;
	}

	export interface DeleteObjectResult {
		res: {
			status: number;
			statusCode: number;
			headers: { [key: string]: string };
			size: number;
			rt: number;
		};
	}

	export interface ListObjectsOptions {
		prefix?: string;
		marker?: string;
		maxKeys?: number;
		delimiter?: string;
		headers?: { [key: string]: string };
		timeout?: number;
		[key: string]: any;
	}

	export interface ListObjectsResult {
		objects: Array<{
			name: string;
			url: string;
			lastModified: string;
			etag: string;
			type: string;
			size: number;
			storageClass: string;
		}>;
		prefixes: string[];
		isTruncated: boolean;
		nextMarker?: string;
		res: {
			status: number;
			statusCode: number;
			headers: { [key: string]: string };
			size: number;
			rt: number;
		};
	}

	export class OSS {
		constructor(options: OSSOptions);
		put(name: string, file: string | Buffer | Blob | File, options?: PutObjectOptions): Promise<PutObjectResult>;
		get(name: string, file?: string, options?: GetObjectOptions): Promise<GetObjectResult>;
		head(name: string, options?: HeadObjectOptions): Promise<HeadObjectResult>;
		delete(name: string, options?: DeleteObjectOptions): Promise<DeleteObjectResult>;
		list(options?: ListObjectsOptions): Promise<ListObjectsResult>;
		signatureUrl(name: string, options?: { expires?: number; method?: string; headers?: { [key: string]: string } }): string;
		[key: string]: any;
	}

	export default OSS;
}

