// A first-party dependency's orchestrator. The package needn't be installed for its import to be reported.
import { placeOrder } from '@ianflanagan1/orders/orchestrators/placeOrder.ts';

export const place = (): unknown => placeOrder;
