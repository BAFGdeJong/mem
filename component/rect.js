export class ComponentRect {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;

    this.width = width;
    this.height = height;
  }

  isInBounds(x, y) {
    return (
      x >= this.x &&
      x <= this.x + this.width &&

      y >= this.y &&
      y <= this.y + this.height
    );
  }

  isColliding(other) {
    return (
      other.x >= this.x &&
      other.x <= this.x + this.width &&

      other.y >= this.y &&
      other.y <= this.y + this.height
    );
  }

  warp(x, y) {
    this.x = x;
    this.y = y;
  }

  move(x, y) {
    this.x += x;
    this.y += y;
  }
}