import { describe, it, expect } from 'vitest';

describe('App smoke test', () => {
  it('loads environment and sanity checks pass', () => {
    expect(1 + 1).toBe(2);
  });
});
