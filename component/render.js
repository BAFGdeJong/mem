export class ComponentRenderRect {
  constructor(color) {
    this.color = color;
  }

  getColor() {
    return this.color;
  }

  setColor(color) {
    this.color = color;
  }

  render(ctx, rect) {
    ctx.fillStyle = this.color;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
}

export class ComponentRenderText {
  constructor(text, color, font) {
    this.text = text;
    this.color = color;
    this.font = font;
  }

  getText() {
    return this.text;
  }

  getColor() {
    return this.color;
  }

  setText(text) {
    this.text = text;
  }

  setColor(color) {
    this.color = color;
  }

  render(ctx, rect) {
    ctx.fillStyle = this.color;
    ctx.font = this.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.text, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width);
  }
}
