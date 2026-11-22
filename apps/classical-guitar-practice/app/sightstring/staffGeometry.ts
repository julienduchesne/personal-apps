export interface Raster {
  width: number;
  height: number;
  pixels: Uint8Array;
}

interface Segment {
  x: number;
  top: number;
  spacing: number;
  slope: number;
  confidence: number;
}

export interface StaffGeometry {
  columns: { top: number; spacing: number }[];
  left: number;
  right: number;
  spacing: number;
  line: number;
  track: number;
}

export function adaptiveInk({ width, height, pixels }: Raster, keepVertical = false): Uint8Array {
  const ink = new Uint8Array(pixels.length);
  const radius = Math.min(height - 1, Math.max(9, Math.round(width / 105)));
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = 0; y <= radius; y++) sum += pixels[y * width + x];
    for (let y = 0; y < height; y++) {
      const position = y * width + x;
      const count = Math.min(height - 1, y + radius) - Math.max(0, y - radius) + 1;
      if (pixels[position] < Math.min(172, sum / count - 23)) ink[position] = 1;
      if (y >= radius) sum -= pixels[(y - radius) * width + x];
      if (y + radius + 1 < height) sum += pixels[(y + radius + 1) * width + x];
    }
  }
  if (keepVertical) {
    const limit = Math.min(radius, width - 1);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      let sum = 0;
      for (let x = 0; x <= limit; x++) sum += pixels[row + x];
      for (let x = 0; x < width; x++) {
        const count = Math.min(width - 1, x + limit) - Math.max(0, x - limit) + 1;
        if (pixels[row + x] < Math.min(172, sum / count - 23)) ink[row + x] = 1;
        if (x >= limit) sum -= pixels[row + x - limit];
        if (x + limit + 1 < width) sum += pixels[row + x + limit + 1];
      }
    }
  }
  return ink;
}

function findSegments(width: number, height: number, ink: Uint8Array, x: number, halfWidth: number) {
  const candidates: Segment[] = [];
  const radius = Math.min(x, width - 1 - x, halfWidth);
  const dx = Array.from({ length: Math.floor(radius * 2 / 3) + 1 }, (_, i) => i * 3 - radius);
  const slopes = [0, -0.05, 0.05, -0.10, 0.10, -0.15, 0.15, -0.20, 0.20, -0.25, 0.25, -0.32, 0.32];
  const minimum = Math.ceil(dx.length * 0.48);
  const projection = new Uint8Array(height);
  for (const slope of slopes) {
    const offsets = dx.map((d) => Math.round(d * slope) * width + x + d);
    const margin = Math.ceil(Math.abs(slope) * radius) + 1;
    projection.fill(0);
    for (let y = margin; y < height - margin; y++) {
      let count = 0;
      for (const offset of offsets) count += ink[y * width + offset];
      projection[y] = count;
    }

    const peaks: number[] = [];
    for (let y = margin; y < height - margin; y++) {
      if (projection[y] < minimum) continue;
      let end = y;
      let peak = y;
      while (projection[end + 1] >= minimum) {
        end++;
        if (projection[end] > projection[peak]) peak = end;
      }
      peaks.push(peak);
      y = end;
    }
    for (let i = 0; i < peaks.length; i++) {
      const top = peaks[i];
      for (let j = i + 4; j < peaks.length; j++) {
        const spacing = (peaks[j] - top) / 4;
        if (spacing < 6) continue;
        if (spacing > Math.min(65, width / 9)) break;
        const tolerance = Math.max(1.6, spacing * 0.10);
        let confidence = projection[top] + projection[peaks[j]];
        for (let line = 1; line < 4; line++) {
          const expected = top + line * spacing;
          let found = 0;
          for (let y = Math.ceil(expected - tolerance); y <= expected + tolerance; y++) {
            found = Math.max(found, projection[y] - Math.abs(y - expected) * 0.6);
          }
          if (found < minimum - 1.1) break;
          confidence += found;
          if (line === 3) candidates.push({ x, top, spacing, slope, confidence: confidence / (5 * dx.length) });
        }
      }
    }
  }
  const selected: Segment[] = [];
  for (const candidate of candidates.sort((a, b) => b.confidence - a.confidence || Math.abs(a.slope) - Math.abs(b.slope))) {
    if (!selected.some(({ top, spacing }) => Math.abs(top - candidate.top) < Math.min(spacing, candidate.spacing) * 0.8
      && Math.abs(spacing - candidate.spacing) < Math.max(spacing, candidate.spacing) * 0.26)) selected.push(candidate);
  }
  return selected;
}

function follow(strips: Segment[][], index: number, seed: Segment, direction: number) {
  const trace: Segment[] = [];
  let last = seed;
  let missed = 0;
  for (let i = index + direction; i >= 0 && i < strips.length; i += direction) {
    let best: Segment | undefined;
    let merit = -Infinity;
    for (const candidate of strips[i]) {
      const dx = candidate.x - last.x;
      const spacingChange = Math.abs(candidate.spacing - last.spacing);
      const displacement = Math.abs(candidate.top - last.top - dx * last.slope);
      if (spacingChange > Math.max(2.5, last.spacing * 0.20)
        || displacement > Math.max(last.spacing * 0.6, Math.abs(dx) * 0.29)) continue;
      const strength = candidate.confidence - displacement / last.spacing * 0.5 - spacingChange / last.spacing;
      if (strength > merit) {
        merit = strength;
        best = candidate;
      }
    }
    if (best) {
      trace.push(best);
      last = best;
      missed = 0;
    } else if (++missed > 3) break;
  }
  return trace;
}

function traceColumns(trace: Segment[], width: number) {
  let index = 0;
  return Array.from({ length: width }, (_, x) => {
    while (index + 1 < trace.length && trace[index + 1].x < x) index++;
    const a = trace[index];
    const b = trace[index + 1];
    if (x < a.x || !b) return { top: a.top + (x - a.x) * a.slope, spacing: a.spacing };
    const part = (x - a.x) / (b.x - a.x);
    return { top: a.top + (b.top - a.top) * part, spacing: a.spacing + (b.spacing - a.spacing) * part };
  });
}

function staffEnds(columns: StaffGeometry["columns"], ink: Uint8Array, width: number, start: number, end: number) {
  let left = -1;
  let right = -1;
  for (let x = start; x <= end; x++) {
    const { top, spacing } = columns[x];
    let hits = 0;
    for (let line = 0; line < 5; line++) {
      const index = Math.round(top + line * spacing) * width + x;
      if (ink[index] || ink[index - width] || ink[index + width]) hits++;
    }
    if (hits >= 4) {
      if (left < 0) left = x;
      right = x;
    }
  }
  return { left, right };
}

function linkedByBarlines(upper: StaffGeometry, lower: StaffGeometry, pixels: Uint8Array, width: number) {
  const left = Math.max(upper.left, lower.left);
  const right = Math.min(upper.right, lower.right);
  const midpoint = Math.round((left + right) / 2);
  const gap = lower.columns[midpoint].top - upper.columns[midpoint].top - upper.columns[midpoint].spacing * 4;
  if (gap < upper.spacing || gap > upper.spacing * 13) return false;

  let links = 0;
  let linkedAt = -Infinity;
  for (let x = left; x < right; x += 2) {
    const top = upper.columns[x].top + upper.columns[x].spacing * 4;
    const distance = lower.columns[x].top - top;
    if (x - linkedAt < upper.spacing * 2) continue;
    for (const slope of [0, -0.07, 0.07, -0.14, 0.14, -0.21, 0.21, -0.28, 0.28]) {
      let hits = 0;
      for (let i = 1; i <= 19; i++) {
        const delta = (i / 20 - 0.5) * distance;
        const y = Math.round(top + distance / 2 + delta);
        const position = y * width + Math.round(x + delta * slope);
        const background = Math.max(pixels[position - 5], pixels[position + 5]);
        const dark = Math.min(pixels[position], pixels[position - 1], pixels[position + 1]);
        if (dark < Math.min(175, background - 30)) hits++;
      }
      if (hits >= 16) {
        linkedAt = x;
        if (++links >= 2) return true;
        break;
      }
    }
  }
  return false;
}

export function findStaves({ width, height, pixels }: Raster, ink: Uint8Array): StaffGeometry[] {
  const halfWidth = Math.max(16, Math.round(width / 62));
  const advance = Math.max(12, Math.round(width / 47));
  const strips: Segment[][] = [];
  for (let x = halfWidth; x < width - halfWidth; x += advance) {
    strips.push(findSegments(width, height, ink, x, halfWidth));
  }
  const midpoint = Math.floor(strips.length / 2);
  const seeds = [midpoint, midpoint - 2, midpoint + 2].filter((index) => strips[index]);
  const staves: StaffGeometry[] = [];
  for (const index of seeds) {
    for (const seed of strips[index]) {
      if (staves.some(({ columns }) => Math.abs(columns[seed.x].top - seed.top) < seed.spacing * 3.85)) continue;
      const trace = [...follow(strips, index, seed, -1).reverse(), seed, ...follow(strips, index, seed, 1)];
      if (trace.length < strips.length * 0.52) continue;
      const columns = traceColumns(trace, width);
      const { left, right } = staffEnds(columns, ink, width,
        Math.max(0, trace[0].x - advance * 2), Math.min(width - 1, trace[trace.length - 1].x + advance * 2));
      if (right - left < width * 0.50) continue;
      const spacings = trace.map((point) => point.spacing).sort((a, b) => a - b);
      staves.push({ columns, left, right, spacing: spacings[Math.floor(spacings.length / 2)], line: 0, track: 0 });
    }
  }
  staves.sort((a, b) => a.columns[Math.floor(width / 2)].top - b.columns[Math.floor(width / 2)].top);
  let line = 0;
  let track = 0;
  for (const [index, staff] of staves.entries()) {
    // A shared barline joins parts; blank space starts the next musical line.
    if (index === 0 || !linkedByBarlines(staves[index - 1], staff, pixels, width)) {
      line++;
      track = 0;
    }
    staff.line = line;
    staff.track = ++track;
  }
  return staves;
}
