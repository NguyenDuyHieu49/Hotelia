  constructor() {
    try {
      const path = join(__dirname, 'models', 'hotelia-lgbm.active.json');
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
