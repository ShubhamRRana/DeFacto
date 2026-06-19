function parseHex(hex) {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function toHex(r, g, b) {
  const clamp = (n) => Math.round(Math.min(255, Math.max(0, n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
}

function blendHex(sourceHex, targetHex, amount) {
  const source = parseHex(sourceHex);
  const target = parseHex(targetHex);
  return toHex(
    source.r + (target.r - source.r) * amount,
    source.g + (target.g - source.g) * amount,
    source.b + (target.b - source.b) * amount,
  );
}

/** Blend hex accent toward a target color for pastel card backgrounds. */
export function topicCardTint(hex, amount = 0.92, blendTarget = '#ffffff') {
  if (!hex || !hex.startsWith('#')) return blendTarget;
  return blendHex(hex, blendTarget, amount);
}

/** Convert a hex color to an rgba string with the given alpha (0–1). */
export function withAlpha(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(0,0,0,${alpha})`;
  const { r, g, b } = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
