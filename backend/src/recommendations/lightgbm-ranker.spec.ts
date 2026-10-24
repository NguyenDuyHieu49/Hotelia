import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOTELIA_FEATURES, HoteliaLightGbmRanker, evaluateLightGbm } from './lightgbm-ranker';

describe('Hotelia LightGBM serving', () => {
  const artifact = JSON.parse(readFileSync(join(__dirname, 'models', 'hotelia-lgbm.active.json'), 'utf8'));

  it('matches Python LightGBM predictions', () => {
    expect(artifact.feature_names).toEqual(HOTELIA_FEATURES);
    for (const testCase of artifact.parity_cases) {
      expect(evaluateLightGbm(artifact, testCase.features)).toBeCloseTo(testCase.score, 9);
    }
  });

  it('loads and ranks Hotelia candidates', () => {
    const ranker = new HoteliaLightGbmRanker();
    expect(ranker.loaded).toBe(true);
    expect(ranker.version).toBe('hotelia-lgbm-2026-10-23-v2');
    const hotels = [
      { id: 'a', name: 'A', city: 'Đà Nẵng', amenities: ['wifi', 'pool'], stars: 4, rating: 4.6, reviews: 40, price: 1_200_000 },
      { id: 'b', name: 'B', city: 'Hà Nội', amenities: ['wifi'], stars: 3, rating: 4.0, reviews: 10, price: 800_000 },
    ];
    const ranked = ranker.rank(hotels, [{ hotel: hotels[0], weight: 1 }], new Date('2026-10-23T12:00:00Z'));
    expect(ranked).toHaveLength(2);
    expect(ranked!.every(result => Number.isFinite(result.score))).toBe(true);
  });
});
