export function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

export function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

export function lerp(a, b, t) {
  return (1-t) * a + t * b;
}

export function clamp(min, value, max) {
  return Math.max(min, Math.min(max, value));
}

export function hex2Rgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  const v = parseInt(h, 16);
  return {
    r: (v >> 16) & 255,
    g: (v >> 8) & 255,
    b: v & 255,
  };
}

export function hexAlpha(hex) {
  const h = hex.replace('#', '');
  if (h.length === 8) return parseInt(h.slice(6, 8), 16) / 255;
  if (h.length === 4) return parseInt(h[3] + h[3], 16) / 255;
  return 1;
}

export function rgb2hex(str) {
  const match = str.match(/(\d+)\D+(\d+)\D+(\d+)/);
  if (!match) return '#000000';

  return '#' +
    (match[1] | 1 << 8).toString(16).slice(1) +
    (match[2] | 1 << 8).toString(16).slice(1) +
    (match[3] | 1 << 8).toString(16).slice(1);
}