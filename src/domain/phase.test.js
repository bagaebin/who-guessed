import { describe, expect, it } from 'vitest';
import { getEliminationRange, getPhaseByRemaining } from './phase';
describe('phase calculation', () => {
    it('maps remaining tiles to phases', () => {
        expect(getPhaseByRemaining(12)).toBe('early');
        expect(getPhaseByRemaining(8)).toBe('mid');
        expect(getPhaseByRemaining(3)).toBe('late');
    });
    it('returns elimination bounds per phase', () => {
        expect(getEliminationRange('early')).toEqual({ min: 3, max: 4 });
        expect(getEliminationRange('mid')).toEqual({ min: 2, max: 3 });
        expect(getEliminationRange('late')).toEqual({ min: 1, max: 2 });
    });
});
