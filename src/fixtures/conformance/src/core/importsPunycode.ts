// Real punycode 2.3.1, which is pure: its one global regular expression is used only by replace, which resets it.
import punycode from 'punycode/';

export const encoded = (label: string): unknown => punycode.encode(label);
