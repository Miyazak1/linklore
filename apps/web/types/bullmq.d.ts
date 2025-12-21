declare module 'bullmq' {
	export interface QueueOptions {
		connection?: any;
		[key: string]: any;
	}

	export class Queue {
		constructor(name: string, options?: QueueOptions);
		getWaitingCount(): Promise<number>;
		getActiveCount(): Promise<number>;
		[key: string]: any;
	}
}

