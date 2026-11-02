// A test suite's shape, without the test framework: a reassignable local set before each test.
const beforeEach = (setUp: () => void): void => {
  setUp();
};

export function suite(): number {
  let fixture = 0;
  beforeEach(() => {
    fixture = 1;
  });
  return fixture;
}
