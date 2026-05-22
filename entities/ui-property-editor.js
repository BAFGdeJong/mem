export class UIPropertyEditor {
  constructor() {
    this.input = document.createElement('input');
    this.input.style.position = 'absolute';
    this.input.style.display = 'none';
    this.input.style.background = '#222';
    this.input.style.color = '#fff';
    this.input.style.border = '1px solid #555';
    this.input.style.fontFamily = 'monospace';
    this.input.style.fontSize = '10px';
    this.input.style.padding = '2px 4px';
    this.input.style.zIndex = '9999';
    document.body.appendChild(this.input);

    this.active = false;
    this.callback = null;

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.confirm();
      if (e.key === 'Escape') this.close();
      e.stopPropagation();
    });
  }

  open(x, y, value, callback) {
    if (this.active) {
      this.close();
      return;
    }

    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    this.input.style.left = `${rect.left + x * scaleX}px`;
    this.input.style.top = `${rect.top + y * scaleY}px`;
    this.input.style.display = 'block';
    this.input.value = String(value);
    this.callback = callback;
    this.active = true;

    setTimeout(() => this.input.focus(), 0);
  }

  confirm() {
    if (this.callback) this.callback(this.input.value);
    this.close();
  }

  close() {
    this.input.style.display = 'none';
    this.input.blur();
    this.active = false;
    this.callback = null;
  }
}