// The gap the listing records: a first-party dependency's core type, which the core may reference, is reported too.
import type { Money } from '@ianflanagan1/orders/core/money.ts';

export const describe = (money: Money): string => typeof money;
