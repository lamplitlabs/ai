import { describe, expect, it } from 'vitest';
import { models } from './data';

describe('release gate consistency (js/ui/src/data/site.json)', () => {
  it('shows a release badge only when every per-gate check passed, so OfferingCard never contradicts the gates', () => {
    const measured = models.filter((m) => m.gate);
    expect(measured.length).toBeGreaterThan(0);
    for (const m of measured) {
      const checks = Object.values(m.gate!.gates);
      expect(checks.length, `${m.name} has gate checks`).toBeGreaterThan(0);
      expect(m.gate!.release, `${m.name}: release badge must equal all gates ok`).toBe(checks.every((g) => g.ok));
    }
  });
});
