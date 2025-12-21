export type AiTaskKind = 'summarize' | 'evaluate' | 'facilitate' | 'solo_plugin';

export type RouteContext = {
	userId?: string | null;
	task: AiTaskKind;
	estimatedMaxCostCents: number;
};

export type AiCallResult = {
	text: string;
	usage: { prompt: number; completion: number; costCents: number };
	meta?: Record<string, unknown>;
};

export interface AiAdapter {
	name: string;
	test(credential: string, model?: string): Promise<{ ok: true } | { ok: false; error: string }>;
	infer(opts: {
		credential: string;
		model: string;
		prompt: string;
		temperature?: number;
		maxTokens?: number;
	}): Promise<AiCallResult>;
}

/**
 * Route AI call to appropriate handler
 * This is a wrapper that delegates to the actual implementation in apps/web/lib/ai/router.ts
 */
export async function routeAiCall(ctx: RouteContext & { prompt: string }): Promise<AiCallResult> {
	// Re-export from the actual implementation
	// In a monorepo setup, we can import directly
	// For now, this will be used as a type/interface definition
	// The actual implementation is in apps/web/lib/ai/router.ts
	throw new Error('Please use routeAiCall from apps/web/lib/ai/router.ts directly in the web app');
}











