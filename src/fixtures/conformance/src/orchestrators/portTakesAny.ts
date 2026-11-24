// A port whose method takes a value of any type.
export interface Bodies {
  readonly save: (body: any) => Promise<void>;
}

export const saveBody = (bodies: Bodies, text: string): Promise<void> => bodies.save(text);
