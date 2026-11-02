import { hello } from '../../orchestrators/app.ts';

// A driving adapter answers a request by calling an orchestrator.
export const handle = (): string => hello();
