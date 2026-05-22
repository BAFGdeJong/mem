export class Scene {
  name = '';
  z = 0;
  children = [];

  constructor(name, { z = 0 } = {}) {
    this.name = name;
    this.z = z;
  }

  async preload() {}
  async init() {}
  async exit() {}
}