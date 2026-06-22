import { Entity } from './entity.js';
import * as engine from '../engine.js';

export class UIPanel extends Entity {
  static DEBUG_LINES = false;

  constructor({
    tag = 'ui-panel',
    groups = [],
    visible = true,
    anchor = 'top-left',
    x = 0,
    y = 0,
    width = null,
    height = null,
    direction = 'vertical',
    background = 'rgba(1,1,1,1.0)',
    padding = 5,
    margin = 0,
    scrollable = false,
    alignX = 'left',
    alignY = 'top',
    spread = false,
    cellAlignX = 'left',
    cellAlignY = 'top',
    offsetX = 0,
    offsetY = 0
  } = {}) {
    super({ tag, groups });
    this.visible = visible;
    this.anchor = anchor;
    this.x = x;
    this.y = y;
    this.width = width;
    this.fixedWidth = width !== null;
    this.height = height;
    this.fixedHeight = height !== null;
    this.direction = direction;
    this.background = background;
    this.padding = padding;
    this.margin = margin;
    this.alignX = alignX;
    this.alignY = alignY;
    this.spread = spread;
    this.cellAlignX = cellAlignX;
    this.cellAlignY = cellAlignY;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.children = [];

    this.scrollable = scrollable;
    this.scroll = 0;
    this.contentHeight = 0;
    this.dragging = false;
    this.barX = 0;
  }

  add(child) {
    this.children.push(child);
    return this;
  }

  layout(x, y, w, h) {
    this.x = x + this.offsetX;
    this.y = y + this.offsetY;
    this.width = w;
    this.height = h;
    this.fixedWidth = true;
    this.fixedHeight = true;
  }

  getMinWidth(ctx) {
    const p = this.padding;

    if (this.fixedWidth) return this.width;

    if (this.direction === 'horizontal') {
      let total = 0;
      for (const child of this.children) {
        total += child.getMinWidth ? child.getMinWidth(ctx) : 50;
      }
      return total + this.margin * (this.children.length - 1) + p * 2;
    } else {
      let max = 0;
      for (const child of this.children) {
        const w = child.getMinWidth ? child.getMinWidth(ctx) : 50;
        max = Math.max(max, w);
      }
      return max + p * 2;
    }
  }

  getMinHeight() {
    if (this.fixedHeight) return this.height;

    const count = this.children.length;
    const p = this.padding;
    if (count === 0) return p * 2;

    const gapCount = Math.max(0, count - 1);
    const rows = this.children.map(c => Math.max(20, c.getMinHeight ? c.getMinHeight() : 20));

    if (this.direction === 'horizontal') {
      return Math.max(...rows) + p * 2;
    }
    return rows.reduce((a, b) => a + b, 0) + this.margin * gapCount + p * 2;
  }

  getCellLayout(child, cx, cy, cw, ch, ctx) {
    let x = cx;
    let y = cy;
    let w = cw;
    let h = ch;
    const lineHeight = Math.max(20, child.getMinHeight ? child.getMinHeight() : 20);

    if (this.cellAlignX !== 'left' && child.getMinWidth) {
      const childW = child.getMinWidth(ctx);
      if (this.cellAlignX === 'center') x = cx + (cw - childW) / 2;
      if (this.cellAlignX === 'right') x = cx + cw - childW;
      w = childW;
    }

    if (this.cellAlignY === 'middle') { y = cy + (ch - lineHeight) / 2; h = lineHeight; }
    if (this.cellAlignY === 'bottom') { y = cy + ch - lineHeight; h = lineHeight; }

    return { x, y, w, h };
  }

  drawChild(ctx, child, cellX, cellY, cellW, cellH) {
    if (!this.visible) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(cellX, cellY, cellW, cellH);
    ctx.clip();
    child.draw(ctx);
    ctx.restore();
  }

  updateScroll(mouseY) {
    if (!this.visible) return;

    const maxScroll = Math.max(0, this.contentHeight - this.height);
    const ratio = Math.max(0, Math.min(1, (mouseY - this.y) / this.height));
    this.scroll = -ratio * maxScroll;
  }

  input(event, e) {
    if (!this.visible) return;

    const mouse = engine.getMousePosition();
    const button = e?.button ?? -1;

    for (const child of this.children) {
      if (child.handleInput) child.handleInput(event, { ...mouse, button });
      if (child instanceof UIPanel) child.input(event, e);
    }

    if (!this.scrollable) return;

    if (event === 'mousedown') {
      if (mouse.x >= this.barX && mouse.x <= this.barX + 10 && mouse.y >= this.y && mouse.y <= this.y + this.height) {
        this.dragging = true;
        this.updateScroll(mouse.y);
      }
    }

    if (event === 'mousemove' && this.dragging) {
      this.updateScroll(mouse.y);
    }

    if (event === 'mouseup') {
      this.dragging = false;
    }
  }

  drawDebugMeasurements(ctx) {
    if (!this.visible || !UIPanel.DEBUG_LINES) return;

    const mouse = engine.getMousePosition();
    if (mouse.x < this.x || mouse.x > this.x + this.width || mouse.y < this.y || mouse.y > this.y + this.height) return;

    const screen = engine.getScreenSize();
    const left = this.x;
    const right = screen.width - this.x - this.width;
    const top = this.y;
    const bottom = screen.height - this.y - this.height;

    ctx.font = '10px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    ctx.fillStyle = '#ff00ff';
    ctx.fillText(`${Math.round(this.width)} x ${Math.round(this.height)}`, this.x + this.width / 2, this.y + this.height / 2);

    ctx.strokeStyle = '#ff00ff';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, this.y + this.height / 2);
    ctx.lineTo(this.x, this.y + this.height / 2);
    ctx.stroke();
    ctx.fillText(`${Math.round(left)}`, left / 2, this.y + this.height / 2 - 10);

    ctx.beginPath();
    ctx.moveTo(this.x + this.width, this.y + this.height / 2);
    ctx.lineTo(screen.width, this.y + this.height / 2);
    ctx.stroke();
    ctx.fillText(`${Math.round(right)}`, this.x + this.width + right / 2, this.y + this.height / 2 - 10);

    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, 0);
    ctx.lineTo(this.x + this.width / 2, this.y);
    ctx.stroke();
    ctx.fillText(`${Math.round(top)}`, this.x + this.width / 2 + 20, top / 2);

    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y + this.height);
    ctx.lineTo(this.x + this.width / 2, screen.height);
    ctx.stroke();
    ctx.fillText(`${Math.round(bottom)}`, this.x + this.width / 2 + 20, this.y + this.height + bottom / 2);

    ctx.setLineDash([]);
  }

  draw(ctx) {
    if (!this.visible) return;

    const count = this.children.length;
    const p = this.padding;
    const m = this.margin;
    const lineHeight = 20;
    const scrollbarWidth = this.scrollable ? 12 : 0;
    const gapCount = Math.max(0, count - 1);

    const rowHeights = this.children.map(c => Math.max(lineHeight, c.getMinHeight ? c.getMinHeight() : lineHeight));
    const rowHeightsTotal = rowHeights.reduce((a, b) => a + b, 0);
    const maxChildHeight = count > 0 ? Math.max(lineHeight, ...rowHeights) : lineHeight;

    // Auto-size width for horizontal
    if (this.direction === 'horizontal' && count > 0 && !this.fixedWidth) {
      let maxChildWidth = 0;
      for (let i = 0; i < count; i++) {
        if (this.children[i].getMinWidth) {
          maxChildWidth = Math.max(maxChildWidth, this.children[i].getMinWidth(ctx));
        }
      }
      this.width = maxChildWidth * count + m * gapCount + p * 2 + scrollbarWidth;
    }

    // Auto-size height for horizontal
    if (this.direction === 'horizontal' && count > 0 && !this.fixedHeight) {
      this.height = maxChildHeight + p * 2;
    }

    // Auto-size for vertical
    if (this.direction === 'vertical' && count > 0) {
      this.contentHeight = rowHeightsTotal + m * gapCount + p * 2;

      if (!this.fixedHeight) {
        this.height = this.contentHeight;
      }

      if (!this.fixedWidth) {
        let maxChildWidth = 0;
        for (let i = 0; i < count; i++) {
          if (this.children[i].getMinWidth) {
            maxChildWidth = Math.max(maxChildWidth, this.children[i].getMinWidth(ctx));
          }
        }
        this.width = maxChildWidth + p * 2 + scrollbarWidth;
      }
    }

    // Apply anchor
    let drawX = this.x;
    let drawY = this.y;

    if (this.anchor.includes('center')) drawX = this.x - this.width / 2;
    if (this.anchor.includes('right')) drawX = this.x - this.width;
    if (this.anchor.includes('middle')) drawY = this.y - this.height / 2;
    if (this.anchor.includes('bottom')) drawY = this.y - this.height;

    const origX = this.x;
    const origY = this.y;
    this.x = drawX;
    this.y = drawY;

    this.barX = this.x + this.width - 10;

    if (this.scrollable) {
      const maxScroll = Math.max(0, this.contentHeight - this.height);
      if (this.scroll < -maxScroll) this.scroll = -maxScroll;
      if (this.scroll > 0) this.scroll = 0;
    }

    ctx.fillStyle = this.background;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    if (UIPanel.DEBUG_LINES) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }

    if (count === 0) {
      this.x = origX;
      this.y = origY;
      return;
    }

    const innerX = this.x + p;
    const innerY = this.y + p;
    const innerW = this.width - p * 2 - scrollbarWidth;
    const innerH = this.scrollable ? this.contentHeight - p * 2 : this.height - p * 2;

    if (this.scrollable) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.x, this.y, this.width - scrollbarWidth, this.height);
      ctx.clip();
    }

    const scrollOffset = this.scrollable ? this.scroll : 0;

    if (this.direction === 'horizontal') {
      const widths = [];
      let totalWidth = 0;
      for (let i = 0; i < count; i++) {
        const w = this.children[i].getMinWidth ? this.children[i].getMinWidth(ctx) : innerW / count;
        widths.push(w);
        totalWidth += w;
      }

      if (this.spread) {
        const totalGap = m * gapCount;
        const cw = (innerW - totalGap) / count;
        for (let i = 0; i < count; i++) {
          widths[i] = cw;
        }
        totalWidth = innerW - totalGap;
      }

      let startX = innerX;
      if (this.alignX === 'center') startX = innerX + (innerW - totalWidth - m * gapCount) / 2;
      if (this.alignX === 'right') startX = innerX + innerW - totalWidth - m * gapCount;

      let startY = innerY;
      if (this.alignY === 'middle') startY = innerY + (innerH - maxChildHeight) / 2;
      if (this.alignY === 'bottom') startY = innerY + innerH - maxChildHeight;

      let cx = startX;
      for (let i = 0; i < count; i++) {
        let cy = startY + scrollOffset;
        let ch = this.spread ? innerH : maxChildHeight;

        const cell = this.getCellLayout(this.children[i], cx, cy, widths[i], ch, ctx);

        if (UIPanel.DEBUG_LINES) {
          ctx.strokeStyle = 'yellow';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx, cy, widths[i], ch);
          ctx.strokeStyle = 'cyan';
          ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
        }

        this.children[i].layout(cell.x, cell.y, cell.w, cell.h);
        if (this.children[i] instanceof UIPanel) {
          this.drawChild(ctx, this.children[i], cx, cy, widths[i], ch);
        } else {
          this.children[i].draw(ctx);
        }
        cx += widths[i] + m;
      }
    } else {
      const totalGap = m * gapCount;
      const spreadCh = (innerH - totalGap) / count;
      const totalHeight = this.spread ? innerH : rowHeightsTotal + totalGap;

      let startY = innerY;
      if (this.alignY === 'middle') startY = innerY + (innerH - totalHeight) / 2;
      if (this.alignY === 'bottom') startY = innerY + innerH - totalHeight;

      let cursorY = startY;
      for (let i = 0; i < count; i++) {
        const ch = this.spread ? spreadCh : rowHeights[i];
        let cx = innerX;
        let childW = this.spread ? innerW : (this.children[i].getMinWidth ? this.children[i].getMinWidth(ctx) : innerW);

        if (this.alignX === 'center') cx = innerX + (innerW - childW) / 2;
        if (this.alignX === 'right') cx = innerX + innerW - childW;

        let cy = cursorY + scrollOffset;

        const cell = this.getCellLayout(this.children[i], cx, cy, childW, ch, ctx);

        if (UIPanel.DEBUG_LINES) {
          ctx.strokeStyle = 'yellow';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx, cy, childW, ch);
          ctx.strokeStyle = 'cyan';
          ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
        }

        this.children[i].layout(cell.x, cell.y, cell.w, cell.h);
        if (this.children[i] instanceof UIPanel) {
          this.drawChild(ctx, this.children[i], cx, cy, childW, ch);
        } else {
          this.children[i].draw(ctx);
        }

        cursorY += ch + m;
      }
    }

    if (this.scrollable) {
      ctx.restore();

      ctx.fillStyle = '#333';
      ctx.fillRect(this.barX, this.y, 10, this.height);

      if (this.contentHeight > this.height) {
        const maxScroll = Math.max(0, this.contentHeight - this.height);
        const thumbHeight = Math.max(20, (this.height / this.contentHeight) * this.height);
        const thumbY = this.y + (-this.scroll / maxScroll) * (this.height - thumbHeight);
        ctx.fillStyle = this.dragging ? '#888' : '#666';
        ctx.fillRect(this.barX, thumbY, 10, thumbHeight);
      }
    }

    this.drawDebugMeasurements(ctx);

    this.x = origX;
    this.y = origY;
  }
}