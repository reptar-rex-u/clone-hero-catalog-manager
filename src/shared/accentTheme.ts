/** Default CH Catalog green accent. */
export const DEFAULT_ACCENT = '#3ecf8e';

export interface AccentThemeVars {
  accent: string;
  accentBright: string;
  accentDeep: string;
  accentRgb: string;
  accentContrast: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function normalizeHex(input: string): string | null {
  const raw = input.trim();
  const m = raw.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  return `#${m[1].toLowerCase()}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex(hex) ?? DEFAULT_ACCENT;
  return {
    r: Number.parseInt(h.slice(1, 3), 16),
    g: Number.parseInt(h.slice(3, 5), 16),
    b: Number.parseInt(h.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsl(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
      break;
  }
  h /= 6;
  return { h, s, l };
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToRgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/**
 * Build accent palette from a base hex, mirroring the original green tones:
 * bright button top, deep button bottom, soft alpha washes via --accent-rgb.
 */
export function deriveAccentTheme(hexInput: string): AccentThemeVars {
  const accent = normalizeHex(hexInput) ?? DEFAULT_ACCENT;
  const { r, g, b } = hexToRgb(accent);
  const { h, s, l } = rgbToHsl(r, g, b);

  // Original green ~ L 0.53; bright ~ +0.07; deep ~ -0.10
  const bright = hslToRgb(h, s, clamp(l + 0.07, 0.2, 0.85));
  const deep = hslToRgb(h, clamp(s * 0.95, 0, 1), clamp(l - 0.1, 0.12, 0.7));

  const accentContrast =
    relativeLuminance(r, g, b) > 0.45 ? '#0a1210' : '#f4fff8';

  return {
    accent,
    accentBright: rgbToHex(bright.r, bright.g, bright.b),
    accentDeep: rgbToHex(deep.r, deep.g, deep.b),
    accentRgb: `${r}, ${g}, ${b}`,
    accentContrast,
  };
}

export function applyAccentTheme(hexInput: string): AccentThemeVars {
  const theme = deriveAccentTheme(hexInput);
  const root = document.documentElement;
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-bright', theme.accentBright);
  root.style.setProperty('--accent-deep', theme.accentDeep);
  root.style.setProperty('--accent-rgb', theme.accentRgb);
  root.style.setProperty('--accent-contrast', theme.accentContrast);
  return theme;
}
