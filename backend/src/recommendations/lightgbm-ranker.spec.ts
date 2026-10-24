import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOTELIA_FEATURES, HoteliaLightGbmRanker, candidateFeatures, evaluateLightGbm } from './lightgbm-ranker';
import { Candidate } from './ranking';

describe('Hotelia LightGBM serving', () => {
  const artifact = JSON.parse(readFileSync(join(__dirname, 'models', 'hotelia-lgbm.active.json'), 'utf8'));

  it('matches Python LightGBM predictions', () => {
    expect(artifact.feature_names).toEqual(HOTELIA_FEATURES);
    for (const testCase of artifact.parity_cases) {
      expect(evaluateLightGbm(artifact, testCase.features)).toBeCloseTo(testCase.score, 9);
    }
  });

  it('builds the same 16 features as the Python trainer', () => {
    expect(artifact.feature_parity_cases.length).toBeGreaterThan(0);
    for (const testCase of artifact.feature_parity_cases) {
      const candidates: Candidate[] = testCase.candidates;
      const byId = new Map(candidates.map(hotel => [hotel.id, hotel]));
      const signals = testCase.signals.map((signal: { hotelId: string; weight: number }) => ({
        hotel: byId.get(signal.hotelId)!, weight: signal.weight,
      }));
      candidates.forEach((hotel, index) => {
        const actual = candidateFeatures(hotel, candidates, signals, new Date(testCase.now));
        actual.forEach((value, feature) => {
          expect([HOTELIA_FEATURES[feature], value]).toEqual([HOTELIA_FEATURES[feature], expect.closeTo(testCase.features[index][feature], 9)]);
        });
      });
    }
  });

  it('uses Vietnam time regardless of the server time zone', () => {
    const hotel: Candidate = { id: 'a', name: 'A', city: 'Huế', amenities: [], stars: 3, rating: 4, reviews: 10, price: 700_000 };
    const at = (iso: string) => candidateFeatures(hotel, [hotel], [], new Date(iso));
    const hourSin = HOTELIA_FEATURES.indexOf('hour_sin');
    const hourCos = HOTELIA_FEATURES.indexOf('hour_cos');
    const weekend = HOTELIA_FEATURES.indexOf('is_weekend');
    // 13:30 UTC Friday is 20:30 Friday in Vietnam.
    const friday = at('2026-10-23T13:30:00Z');
    expect(friday[hourSin]).toBeCloseTo(Math.sin(2 * Math.PI * 20 / 24), 12);
    expect(friday[hourCos]).toBeCloseTo(Math.cos(2 * Math.PI * 20 / 24), 12);
    expect(friday[weekend]).toBe(0);
    // 18:00 UTC Friday is already 01:00 Saturday in Vietnam.
    const saturday = at('2026-10-23T18:00:00Z');
    expect(saturday[hourSin]).toBeCloseTo(Math.sin(2 * Math.PI / 24), 12);
    expect(saturday[weekend]).toBe(1);
  });

  it('loads and ranks Hotelia candidates', () => {
    const ranker = new HoteliaLightGbmRanker();
    expect(ranker.loaded).toBe(true);
    expect(ranker.version).toBe(artifact.version);
    const hotels = [
      { id: 'a', name: 'A', city: 'Đà Nẵng', amenities: ['wifi', 'pool'], stars: 4, rating: 4.6, reviews: 40, price: 1_200_000 },
      { id: 'b', name: 'B', city: 'Hà Nội', amenities: ['wifi'], stars: 3, rating: 4.0, reviews: 10, price: 800_000 },
    ];
    const ranked = ranker.rank(hotels, [{ hotel: hotels[0], weight: 1 }], new Date('2026-10-23T12:00:00Z'));
    expect(ranked).toHaveLength(2);
    expect(ranked!.every(result => Number.isFinite(result.score))).toBe(true);
  });
});
