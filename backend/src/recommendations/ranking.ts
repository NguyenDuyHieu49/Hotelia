/** Content-based ranking. Scores are heuristics, not booking probabilities. */
export interface Candidate {
  id: string; name: string; city: string; amenities: string[];
  stars: number; rating: number; reviews: number; price?: number;
}
export interface Signal { hotel: Candidate; weight: number }
export function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}
export function cityKey(city: string): string {
  const key = normalize(city);
  return ['tphcm','tphochiminh','hochiminhcity','hochiminh','saigon'].includes(key) ? 'hcm' : key;
}
function similarity(a: Candidate, b: Candidate): number {
  const amenities = new Set(a.amenities.map(normalize));
  const other = new Set(b.amenities.map(normalize));
  const union = new Set([...amenities, ...other]);
  const overlap = union.size ? [...amenities].filter(x => other.has(x)).length / union.size : 0;
  const price = a.price && b.price ? Math.min(a.price,b.price)/Math.max(a.price,b.price) : 0;
  const stars = a.stars > 0 && b.stars > 0 ? 1-Math.abs(a.stars-b.stars)/5 : 0;
  return 0.4 * Number(cityKey(a.city)===cityKey(b.city)) + 0.25*overlap + 0.2*price + 0.15*stars;
}
export function rank(candidates: Candidate[], signals: Signal[]) {
  const weight = signals.reduce((sum,s)=>sum+s.weight,0);
  const ranked = candidates.map(h => {
    // Prior prevents a single five-star review dominating established hotels.
    const quality = (Math.max(0,h.reviews)*Math.min(5,Math.max(0,h.rating))+5*3.5)/(Math.max(0,h.reviews)+5)/5;
    const affinity = weight ? signals.reduce((sum,s)=>sum+s.weight*similarity(h,s.hotel),0)/weight : 0;
    const score = weight ? 0.7*affinity+0.3*quality : quality;
    return { hotel:h, score, reason:weight ? 'Tương đồng với khách sạn bạn đã xem hoặc đặt' : 'Khám phá khách sạn tại các điểm đến' };
  });
  // Greedy city diversity for discovery; relevance still dominates with history.
  const selected: typeof ranked = [];
  const cityCounts = new Map<string,number>();
  while(ranked.length) {
    ranked.sort((a,b)=> {
      const adjusted = (x: typeof a) => x.score - (cityCounts.get(cityKey(x.hotel.city))||0)*(weight ? 0.015 : 0.08);
      return adjusted(b)-adjusted(a) || a.hotel.name.localeCompare(b.hotel.name,'vi') || a.hotel.id.localeCompare(b.hotel.id);
    });
    const next = ranked.shift()!;
    selected.push(next);
    const key=cityKey(next.hotel.city); cityCounts.set(key,(cityCounts.get(key)||0)+1);
  }
  return selected;
}
