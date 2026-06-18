export class AssetLoader {
  assets = {};
  loaders = {};
  loaded = 0;
  total = 0;
  onProgress = null;
  callbacks = {};

  registerLoader(type, loaderFn) {
    this.loaders[type] = loaderFn;
  }

  onLoaded(key, callback) {
    if (this.assets[key] && this.assets[key].loaded) {
      callback(this.assets[key].data);
    } else {
      if (!this.callbacks[key]) this.callbacks[key] = [];
      this.callbacks[key].push(callback);
    }
  }

  register(key, src, type) {
    if (!this.loaders[type]) throw new Error(`No loader for type: ${type}`);
    this.assets[key] = { src, type, data: null, loaded: false };
    this.total++;
  }

  async load(key, src, type) {
    this.register(key, src, type);
    await this.loadAsset(key, this.assets[key]);
  }

  async loadAll(onProgress) {
    this.onProgress = onProgress;
    const promises = [];
    for (const [key, asset] of Object.entries(this.assets)) {
      if (asset.loaded) continue;
      promises.push(this.loadAsset(key, asset));
    }
    await Promise.all(promises);
  }

  async loadAsset(key, asset) {
    const loader = this.loaders[asset.type];
    asset.data = await loader(asset.src);
    asset.loaded = true;
    this.loaded++;

    if (this.callbacks[key]) {
      this.callbacks[key].forEach(cb => cb(asset.data));
      delete this.callbacks[key];
    }

    this.onProgress?.(this.loaded, this.total, key);
  }

  unload(key) {
    const asset = this.assets[key];
    if (!asset) return;
    if (asset.loaded) this.loaded--;
    this.total--;
    delete this.assets[key];
  }

  get(key) {
    return this.assets[key]?.data ?? null;
  }

  getProgress() {
    return this.total === 0 ? 1 : this.loaded / this.total;
  }
}