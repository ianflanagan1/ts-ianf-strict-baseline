// A module-level let is state every caller shares.
let calls = 0;

export const count = (): number => {
  calls += 1;
  return calls;
};
