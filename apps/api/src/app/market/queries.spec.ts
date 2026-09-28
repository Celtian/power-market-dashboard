import { validateRange } from './queries';

describe('market query boundaries', () => {
  it('rejects reversed and nonaligned ranges', () => {
    expect(() =>
      validateRange({ from: '2026-09-27T01:00Z', to: '2026-09-27T00:00Z' }, 31),
    ).toThrow();
    expect(() =>
      validateRange({ from: '2026-09-27T00:01Z', to: '2026-09-27T01:00Z' }, 31),
    ).toThrow();
  });
});
