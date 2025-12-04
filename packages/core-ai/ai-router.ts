export type AiTaskKind = 'summarize' | 'evaluate';

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

export async function routeAiCall(ctx: RouteContext & { prompt: string }) {
	// Placeholder: this will be wired to user config and budgeting in Phase 1b
	// For now, just throw to indicate not yet implemented.
	throw new Error('AI router not configured yet');
}











