type Season = 'summer' | 'winter';

// An enum is a union of string literals, so what would be its method is a function over it.
export const isNow = (season: Season): boolean => (new Date() > new Date(0) ? 'summer' : 'winter') === season;
