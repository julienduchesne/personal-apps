import { noteDurations, steps, type Note, type Staff } from "./score";
import { readTimeSignature } from "./timeSignature";

import { adaptiveInk, findStaves, type Raster, type StaffGeometry } from "./staffGeometry";

function template(spacing: number, width: number) {
  const upper: number[] = [];
  const lower: number[] = [];
  const exterior: number[] = [];
  const core: number[] = [];
  const leftEdge: number[] = [];
  const rightEdge: number[] = [];
  const radius = Math.ceil(spacing * 0.9);
  const stride = Math.max(1, Math.floor(spacing / 12));
  for (let y = -radius; y <= radius; y += stride) {
    for (let x = -radius; x <= radius; x += stride) {
      const u = x / spacing;
      const v = y / spacing + 0.29 * u;
      const index = y * width + x;
      if (Math.abs(v) >= 0.16 && (u / 0.60) ** 2 + (v / 0.46) ** 2 <= 0.98) {
        (v < 0 ? upper : lower).push(index);
      }
      if (Math.abs(u) >= 0.43 && Math.abs(u) <= 0.61 && Math.abs(v) <= 0.23) {
        (u < 0 ? leftEdge : rightEdge).push(index);
      }
      if (Math.abs(u) <= 0.24 && Math.abs(v) <= 0.17) core.push(index);
      if (Math.abs(u) <= 0.43 && Math.abs(v) >= 0.54 && Math.abs(v) <= 0.83) exterior.push(index);
    }
  }
  return { upper, lower, exterior, core, leftEdge, rightEdge, radius };
}

function findStem(ink: Uint8Array, mask: Uint8Array, width: number, x: number, y: number, firstRow: number, spacing: number) {
  const connection = Math.ceil(spacing * 1.25);
  const gapLimit = Math.max(1, Math.floor(spacing * 0.28));
  const drift = Math.max(1, Math.floor(spacing * 0.12));
  for (const direction of [-1, 1]) {
    for (let side = Math.floor(spacing * 0.40); side <= Math.floor(spacing * 0.83); side++) {
      // A fingering digit can sit near a real stem, so require the stem to meet this head.
      const column = x + direction * side;
      let gap = 0;
      for (let distance = 0; distance <= connection; distance++) {
        const row = y - direction * distance;
        const position = (firstRow + row) * width + column;
        let dark = false;
        for (let offset = -drift; offset <= drift; offset++) {
          if (mask[position + offset]) {
            dark = true;
            break;
          }
        }
        gap = dark ? 0 : gap + 1;
        if (gap > gapLimit) break;
      }
      if (gap > gapLimit) continue;
      let dark = 0;
      let samples = 0;
      for (let distance = Math.floor(spacing * 0.65); distance <= Math.floor(spacing * 2.8); distance++) {
        const row = y - direction * distance;
        if (row < 0 || row >= ink.length / width) break;
        dark += ink[row * width + column];
        samples++;
      }
      if (samples < Math.floor(spacing * 1.25) || dark < samples * 0.6) continue;
      let last = connection;
      const reach = Math.max(2, Math.round(spacing * 0.22));
      for (let distance = connection; distance <= spacing * 6; distance++) {
        const position = (firstRow + y - direction * distance) * width + column;
        for (let offset = -reach; offset <= reach; offset++) {
          if (!mask[position + offset]) continue;
          last = distance;
          break;
        }
        if (distance - last > gapLimit) break;
      }
      return { x: column, y: firstRow + y - direction * last, direction };
    }
  }
}

type Stem = NonNullable<ReturnType<typeof findStem>>;

function countBeams(mask: Uint8Array, width: number, spacing: number, a: Stem, b: Stem) {
  if (a.direction !== b.direction || b.x - a.x < spacing || b.x - a.x > spacing * 8
    || Math.abs(b.y - a.y) > (b.x - a.x) * 0.36 + spacing * 0.25) return 0;
  const votes = [0, 0, 0, 0];
  const thickness = Math.max(2, Math.round(spacing * 0.23));
  for (let step = 1; step < 8; step++) {
    const x = Math.round(a.x + (b.x - a.x) * step / 8);
    const y = Math.round(a.y + (b.y - a.y) * step / 8);
    let level = 0;
    let previousEnd = -Infinity;
    for (let offset = -Math.round(spacing * 0.24); offset <= Math.round(spacing * 2.45) && level < votes.length;) {
      const start = offset++;
      if (!mask[(y + start * a.direction) * width + x]) continue;
      while (offset <= Math.round(spacing * 2.45) && mask[(y + offset * a.direction) * width + x]) offset++;
      if (offset - start < thickness) continue;
      // An isolated staff line further down a stem is not a secondary beam.
      if (level === 0 ? start + thickness - 1 > Math.round(spacing * 0.65)
        : start - previousEnd > Math.round(spacing * 0.39)) break;
      votes[level++]++;
      previousEnd = offset;
    }
  }
  const missing = votes.findIndex((count) => count < 6);
  return missing === -1 ? votes.length : missing;
}

function findBarlines(mask: Uint8Array, width: number, top: number, spacing: number, from: number, to: number, stems: number[]) {
  const height = Math.round(4 * spacing);
  const bars: { start: number; x: number; strength: number }[] = [];
  for (let x = Math.ceil(from); x < to - spacing * 0.65; x++) {
    if (stems.some((stem) => Math.abs(stem - x) < spacing * 0.48)) continue;
    let strength = 0;
    for (const slope of [0, -0.11, 0.11]) {
      let hits = 0;
      for (let y = 0; y <= height; y += 2) {
        const center = (top + y) * width + Math.round(x + slope * (y - height / 2));
        hits += Number(Boolean(mask[center] || mask[center - 1] || mask[center + 1]));
      }
      strength = Math.max(strength, hits);
    }
    if (strength < (Math.floor(height / 2) + 1) * 0.91) continue;
    const previous = bars.at(-1);
    if (previous && x - previous.start < spacing * 0.65) {
      if (strength >= previous.strength) Object.assign(previous, { x, strength });
    } else bars.push({ start: x, x, strength });
  }
  return bars.map(({ x }) => x);
}

function findNotes({ width, height, pixels }: Raster, top: number, spacing: number, left: number, right: number) {
  const start = Math.max(0, Math.floor(top - spacing * 4.2));
  const end = Math.min(height, Math.ceil(top + spacing * 8.7));
  const lastX = Math.min(width - Math.floor(spacing * 1.5) - 1, right - Math.floor(spacing * 0.4));
  const mask = adaptiveInk({ width, height, pixels }, true);
  const ink = new Uint8Array((end - start) * width);
  for (let y = start; y < end; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const first = x;
      while (x < width && mask[row + x]) x++;
      // Mask horizontal staff lines and beams before matching noteheads.
      if (x - first <= Math.floor(spacing * 1.88)) ink.fill(1, (y - start) * width + first, (y - start) * width + x);
    }
  }
  // Preserve the part of a notehead that crosses a staff or ledger line.
  const maxLineThickness = Math.max(2, Math.round(spacing * 0.25));
  for (let x = 0; x < width; x++) {
    for (let y = start + 1; y < end - 1; y++) {
      const position = (y - start) * width + x;
      if (ink[position] || !ink[position - width] || !mask[y * width + x]) continue;
      let gap = 1;
      while (gap <= maxLineThickness && y + gap < end && !ink[position + gap * width]
        && mask[(y + gap) * width + x]) gap++;
      if (gap <= maxLineThickness && ink[position + gap * width]) {
        for (let offset = 0; offset < gap; offset++) ink[position + offset * width] = 1;
      }
      y += gap - 1;
    }
  }
  const signature = readTimeSignature(ink, width, top - start, spacing, left);
  const firstX = Math.max(Math.floor(spacing * 1.5), left + Math.floor(spacing * 4.15),
    signature ? Math.ceil(signature.right + spacing * 0.36) : 0);
  const samples = template(spacing, width);
  const coverage = (offsets: number[], center: number) => {
    let count = 0;
    for (const offset of offsets) count += ink[center + offset];
    return count / Math.max(1, offsets.length);
  };
  const candidates: { x: number; y: number; step: number; hollow: boolean; strength: number; stem?: Stem }[] = [];
  for (const step of steps) {
    for (const offset of [-0.14, 0, 0.14]) {
      const y = Math.round(top + ((10 - step) / 2 + offset) * spacing);
      if (y - samples.radius < start || y + samples.radius >= end) continue;
      for (let x = firstX; x <= lastX; x += Math.max(1, Math.floor(spacing * 0.10))) {
        const center = (y - start) * width + x;
        const upper = coverage(samples.upper, center);
        if (upper < 0.42) continue;
        const lower = coverage(samples.lower, center);
        if (lower < 0.42) continue;
        const edge = coverage(samples.exterior, center);
        if (edge >= 0.31) continue;
        const core = coverage(samples.core, center);
        const solid = core >= 0.5 && Math.min(upper, lower) >= 0.53;
        const hollow = core <= 0.36;
        if (!solid && !hollow) continue;
        const stem = findStem(ink, mask, width, x, y - start, start, spacing);
        if (!stem) {
          // Whole notes lack stems but still have a wider, closed outline than fingering digits.
          if (solid || Math.min(upper, lower) < 0.59 || edge >= 0.17 || x - left < 5 * spacing
            || coverage(samples.leftEdge, center) < 0.51 || coverage(samples.rightEdge, center) < 0.51) continue;
        }
        candidates.push({
          x, y, step, hollow, stem,
          strength: (upper + lower) / 2 - edge * 0.9 + (solid ? core : 1 - core) * 0.17 - Math.abs(offset) * 0.12,
        });
      }
    }
  }
  const selected: typeof candidates = [];
  for (const candidate of candidates.sort((a, b) => b.strength - a.strength)) {
    if (!selected.some(({ x, y }) => Math.abs(x - candidate.x) < spacing * 0.92 && Math.abs(y - candidate.y) < spacing * 0.76)) {
      selected.push(candidate);
    }
  }
  selected.sort((a, b) => a.x - b.x);
  const barlines = findBarlines(mask, width, top, spacing, firstX, right, selected.flatMap(({ stem }) => stem ? [stem.x] : []));
  const beams = selected.map(({ stem }, index) => {
    const next = selected[index + 1]?.stem;
    return stem && next && !barlines.some((bar) => bar > stem.x && bar < next.x)
      ? countBeams(mask, width, spacing, stem, next) : 0;
  });
  const ids = selected.map(() => crypto.randomUUID());
  const notes = selected.map(({ x, y, step, hollow, stem }, index) => {
    const levels = Math.max(beams[index], beams[index - 1] ?? 0);
    // A beam confirms a filled head even if a staff line obscures its center.
    const openHead = hollow && !levels;
    const duration = openHead ? (stem ? 2 : 4) : noteDurations[4 - levels];
    return {
      id: ids[index], x, y, step, hollow: openHead, duration, accidental: null,
      stem: levels && stem ? { x: stem.x, y: stem.y, up: stem.direction > 0 } : undefined,
      beam: beams[index] ? { to: ids[index + 1], count: beams[index] } : undefined,
    } satisfies Note;
  });
  return { notes, barlines, timeSignature: signature?.meter };
}

function flattenStaff(raster: Raster, geometry: StaffGeometry) {
  const { left, right, columns, spacing } = geometry;
  const x0 = Math.max(0, left - Math.round(spacing * 1.6));
  const width = Math.min(raster.width - 1, right + Math.round(spacing * 1.6)) - x0 + 1;
  const top = Math.ceil(spacing * 4.4);
  const height = top + Math.ceil(spacing * 9.1);
  const pixels = new Uint8Array(width * height).fill(255);
  for (let x = 0; x < width; x++) {
    const sourceX = x + x0;
    const source = columns[sourceX];
    for (let y = 0; y < height; y++) {
      const sourceY = source.top + (y - top) * source.spacing / spacing;
      const row = Math.floor(sourceY);
      if (row < 0 || row + 1 >= raster.height) continue;
      const pixel = row * raster.width + sourceX;
      const amount = sourceY - row;
      pixels[y * width + x] = Math.round(raster.pixels[pixel] * (1 - amount) + raster.pixels[pixel + raster.width] * amount);
    }
  }

  return { width, height, top, pixels, left: left - x0, right: right - x0 };
}

export function readStaffRasters(raster: Raster) {
  return findStaves(raster, adaptiveInk(raster)).map((geometry) => {
    const crop = flattenStaff(raster, geometry);
    const { top, left, right } = crop;
    const { spacing, line, track } = geometry;
    const detected = findNotes(crop, top, spacing, left, right);
    return { crop, staff: { width: crop.width, height: crop.height, top, spacing, left, right, line, track,
      timeSignature: detected.timeSignature, barlines: detected.barlines, notes: detected.notes } };
  });
}

export async function scanPage(file: File, savedPhoto?: string): Promise<{ staves: Staff[]; photo: string }> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch {
    throw new Error("This photo could not be opened. Try a JPEG or PNG.");
  } finally {
    URL.revokeObjectURL(url);
  }

  const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  if (width < 120 || height < 100) throw new Error("This photo is too small. Try a full-page image.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const photo = savedPhoto ?? canvas.toDataURL("image/jpeg", 0.86);
  const data = ctx.getImageData(0, 0, width, height);
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = (data.data[4 * i] * 77 + data.data[4 * i + 1] * 150 + data.data[4 * i + 2] * 29) >> 8;
  }
  const staves = readStaffRasters({ width, height, pixels: gray }).map(({ crop, staff }): Staff => {
    const sheet = document.createElement("canvas");
    sheet.width = crop.width;
    sheet.height = crop.height;
    const context = sheet.getContext("2d")!;
    const output = context.createImageData(crop.width, crop.height);
    for (let i = 0; i < crop.pixels.length; i++) {
      output.data[4 * i] = output.data[4 * i + 1] = output.data[4 * i + 2] = crop.pixels[i];
      output.data[4 * i + 3] = 255;
    }
    context.putImageData(output, 0, 0);
    return { ...staff, image: sheet.toDataURL("image/jpeg", 0.86) };
  });
  if (!staves.length) throw new Error("No five-line staff found. Photograph a flat, well-lit page straight on.");
  return { staves, photo };
}
