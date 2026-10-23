import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Candidate, Signal, cityKey, normalize } from './ranking';

type TreeNode = {
  split_feature?: number;
  threshold?: number | string;
  decision_type?: string;
  default_left?: boolean;
  missing_type?: string;
  left_child?: TreeNode;
  right_child?: TreeNode;
  leaf_value?: number;
};

type Artifact = {
  version: string;
  feature_names: string[];
  tree_info: { tree_structure: TreeNode }[];
  parity_cases?: { features: number[]; score: number }[];
};

export const HOTELIA_FEATURES = [
  'min_price_millions', 'price_relative', 'star_rating', 'rating',
  'review_log', 'amenity_count', 'quality_prior', 'city_affinity',
  'price_affinity', 'star_affinity', 'amenity_affinity', 'history_count',
  'has_history', 'hour_sin', 'hour_cos', 'is_weekend',
] as const;

function evaluateTree(node: TreeNode, features: number[]): number {
  if (typeof node.leaf_value === 'number') return node.leaf_value;
  if (typeof node.split_feature !== 'number' || !node.left_child || !node.right_child) {
    throw new Error('Invalid LightGBM tree node');
  }
  const value = features[node.split_feature];
  const missing = !Number.isFinite(value);
  let goLeft = node.default_left === true;
  if (!missing) {
    if (node.decision_type !== '<=') throw new Error(`Unsupported LightGBM decision type: ${node.decision_type}`);
    goLeft = value <= Number(node.threshold);
  }
  return evaluateTree(goLeft ? node.left_child : node.right_child, features);
}

export function evaluateLightGbm(artifact: Artifact, features: number[]): number {
  if (features.length !== artifact.feature_names.length) throw new Error('LightGBM feature count mismatch');
  return artifact.tree_info.reduce((score, tree) => score + evaluateTree(tree.tree_structure, features), 0);
}

function qualityPrior(candidate: Candidate) {
  const reviews = Math.max(0, candidate.reviews);
  const rating = Math.min(5, Math.max(0, candidate.rating));
  return (reviews * rating + 5 * 3.5) / (reviews + 5) / 5;
}

function amenitySimilarity(left: string[], right: string[]) {
  const a = new Set(left.map(normalize));
  const b = new Set(right.map(normalize));
  const union = new Set([...a, ...b]);
  return union.size ? [...a].filter(value => b.has(value)).length / union.size : 0;
}

function candidateFeatures(candidate: Candidate, candidates: Candidate[], signals: Signal[], now: Date) {
  const prices = candidates.map(item => item.price).filter((price): price is number => Number.isFinite(price) && price! > 0);
  const meanPrice = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 1;
  const price = Number.isFinite(candidate.price) && candidate.price! > 0 ? candidate.price! : meanPrice;
  const signalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const weighted = (mapper: (signal: Signal) => number) => signalWeight
    ? signals.reduce((sum, signal) => sum + signal.weight * mapper(signal), 0) / signalWeight : 0;
  const cityAffinity = weighted(signal => Number(cityKey(signal.hotel.city) === cityKey(candidate.city)));
  const targetLogPrice = weighted(signal => signal.hotel.price && signal.hotel.price > 0 ? Math.log(signal.hotel.price) : Math.log(price));
  const priceAffinity = signalWeight ? Math.exp(-Math.abs(Math.log(price) - targetLogPrice)) : 0;
  const starAffinity = weighted(signal => signal.hotel.stars > 0 && candidate.stars > 0
    ? Math.max(0, 1 - Math.abs(signal.hotel.stars - candidate.stars) / 5) : 0);
  const amenityAffinity = weighted(signal => amenitySimilarity(candidate.amenities, signal.hotel.amenities));
  const hour = now.getHours();
  const angle = 2 * Math.PI * hour / 24;
  const day = now.getDay();
  const values: Record<(typeof HOTELIA_FEATURES)[number], number> = {
    min_price_millions: price / 1_000_000,
    price_relative: price / meanPrice,
    star_rating: Math.max(0, candidate.stars),
    rating: Math.max(0, candidate.rating),
    review_log: Math.log1p(Math.max(0, candidate.reviews)),
    amenity_count: candidate.amenities.length,
    quality_prior: qualityPrior(candidate),
    city_affinity: cityAffinity,
    price_affinity: priceAffinity,
    star_affinity: starAffinity,
    amenity_affinity: amenityAffinity,
    history_count: Math.min(50, signals.length),
    has_history: signalWeight > 0 ? 1 : 0,
    hour_sin: Math.sin(angle),
    hour_cos: Math.cos(angle),
    is_weekend: day === 0 || day === 6 ? 1 : 0,
  };
  return HOTELIA_FEATURES.map(name => values[name]);
}

@Injectable()
export class HoteliaLightGbmRanker {
  private readonly logger = new Logger(HoteliaLightGbmRanker.name);
  private artifact?: Artifact;

  constructor() {
    try {
      const path = join(__dirname, 'models', 'hotelia-lgbm.v1.json');
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as Artifact;
      if (JSON.stringify(parsed.feature_names) !== JSON.stringify(HOTELIA_FEATURES)) {
        throw new Error('Model feature contract does not match backend');
      }
      if (!parsed.tree_info.length) throw new Error('Model has no trees');
      this.artifact = parsed;
    } catch (error) {
      this.logger.warn(`LightGBM unavailable; using content fallback (${error instanceof Error ? error.message : 'load error'})`);
    }
  }

  get version() { return this.artifact?.version; }
  get loaded() { return Boolean(this.artifact); }

  score(features: number[]) {
    if (!this.artifact) throw new Error('LightGBM is not loaded');
    return evaluateLightGbm(this.artifact, features);
  }

  rank(candidates: Candidate[], signals: Signal[], now = new Date()) {
    if (!this.artifact) return undefined;
    try {
      return candidates.map(hotel => ({
        hotel,
        score: this.score(candidateFeatures(hotel, candidates, signals, now)),
        reason: signals.length
          ? 'Phù hợp với lịch sử xem, mức giá và tiện nghi bạn quan tâm'
          : 'Nổi bật về chất lượng, mức giá và tiện nghi',
      })).sort((left, right) => right.score - left.score
        || left.hotel.name.localeCompare(right.hotel.name, 'vi')
        || left.hotel.id.localeCompare(right.hotel.id));
    } catch (error) {
      this.logger.warn(`LightGBM scoring failed; using content fallback (${error instanceof Error ? error.message : 'score error'})`);
      return undefined;
    }
  }
}
