// Small shim to reuse web-side consensusTracker code within the worker process
import { trackConsensus } from '../../apps/web/lib/processing/consensusTracker';
export { trackConsensus };
