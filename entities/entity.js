export class Entity {
  tag = null;
  groups = [];

  constructor (tag = null, groups = []) {
    this.groups = groups;
    this.tag = tag;
  }

  getTag() {
    return this.tag;
  }

  hasAnyTag(tag) {
    return this.tag !== null;
  }

  hasGroup(group) {
    if (this.groups.length < 1) { return false; }
    return this.groups.find(g => g === group);
  }

  getGroups() {
    return this.groups;
  }

  addGroup(group) {
    this.groups.push(group);
  }

  removeGroup(group) {
    this.groups = this.groups.filter(g => g !== group);
  }

  tick() {}

  draw(ctx) {}
}