declare module 'ioredis' {
	interface RedisOptions {
		[key: string]: any;
	}

	class Redis {
		constructor(url?: string, options?: RedisOptions);
		[key: string]: any;
	}

	export default Redis;
}





