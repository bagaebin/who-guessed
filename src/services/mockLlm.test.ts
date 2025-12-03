import { describe, expect, it } from 'vitest';
import { mockInferPlayerAppearance } from './mockLlm';
import { initialTiles } from '../data/tiles';

describe('mockInferPlayerAppearance', () => {
  it('returns profile and eliminates limited tiles', () => {
    const remaining = initialTiles.slice(0, 6);
    const result = mockInferPlayerAppearance('테스트 입력', remaining);
    expect(result.profile).toBeDefined();
    expect(result.eliminatedIds.length).toBeGreaterThan(0);
    expect(result.eliminatedIds.length).toBeLessThanOrEqual(remaining.length - 1);
  });
});
