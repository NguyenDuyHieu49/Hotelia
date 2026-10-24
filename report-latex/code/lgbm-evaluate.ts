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
