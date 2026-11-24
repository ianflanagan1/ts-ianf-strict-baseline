export const build = (code: string): unknown => new Function(code);

export const later = (code: string): void => {
  setTimeout(code, 0);
};
