// An ID type that uses third-party UUID code itself.
import { validate } from 'uuid';

export const isOrderId = (text: string): boolean => validate(text);
