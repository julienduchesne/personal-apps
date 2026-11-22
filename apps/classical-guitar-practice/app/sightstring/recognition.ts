import { steps, type Note, type Staff } from "./score";

interface Raster {
  width: number;
  height: number;
  pixels: Uint8Array;
}

function deskew({ width, height, pixels }: Raster) {
  let slope = 0;
  let best = 0;
  const columns = Array.from({ length: Math.floor(width / 11) }, (_, i) => i * 9 + Math.floor(width / 12));
  for (const increment of [0, ...Array.from({ length: 49 }, (_, i) => i - 24).filter(Boolean)]) {
    const candidate = increment * 0.0025;
    const offsets = columns.map((x) => Math.round((x - width / 2) * candidate));
    const margin = Math.ceil(width * Math.abs(candidate) / 2) + 1;
    let score = 0;
    for (let y = margin; y < height - margin; y++) {
      let ink = 0;
      for (let i = 0; i < columns.length; i++) {
        if (pixels[(y + offsets[i]) * width + columns[i]] < 150) ink++;
      }
      if (ink > columns.length / 2) score += ink * ink;
    }
    if (score > best) {
      best = score;
      slope = candidate;
    }
  }
  if (slope === 0) return pixels;
  const shifted = new Uint8Array(pixels.length).fill(255);
  for (let x = 0; x < width; x++) {
    const offset = Math.round((x - width / 2) * slope);
    for (let y = Math.max(0, -offset); y < Math.min(height, height - offset); y++) {
      shifted[y * width + x] = pixels[(y + offset) * width + x];
    }
  }
  return shifted;
}

interface Line { y: number; left: number; right: number }

function findLines({ width, height, pixels }: Raster) {
  const lines: Line[] = [];
  let peak: Line | undefined;
  const gap = Math.max(2, Math.floor(width / 48));
  for (let y = 0; y < height; y++) {
    const line = { y, left: 0, right: 0 };
    let left = 0;
    let previous = -gap - 1;
    let ink = 0;
    for (let x = 0; x < width; x++) {
      if (pixels[y * width + x] >= 155) continue;
      if (x - previous > gap) {
        left = x;
        ink = 0;
      }
      previous = x;
      ink++;
      if (x - left > line.right - line.left && ink * 2 > x - left) {
        line.left = left;
        line.right = x;
      }
    }
    if (line.right - line.left >= width * 0.36) {
      if (!peak || line.right - line.left > peak.right - peak.left) peak = line;
    } else if (peak) {
      lines.push(peak);
      peak = undefined;
    }
  }
  if (peak) lines.push(peak);
  return lines;
}

function template(spacing: number, width: number) {
  const upper: number[] = [];
  const lower: number[] = [];
  const exterior: number[] = [];
  const core: number[] = [];
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
      if (Math.abs(u) <= 0.24 && Math.abs(v) <= 0.17) core.push(index);
      if (Math.abs(u) <= 0.43 && Math.abs(v) >= 0.54 && Math.abs(v) <= 0.83) exterior.push(index);
    }
  }
  return { upper, lower, exterior, core, radius };
}

function hasStem(ink: Uint8Array, width: number, x: number, y: number, spacing: number) {
  for (const direction of [-1, 1]) {
    for (let side = Math.floor(spacing * 0.40); side <= Math.floor(spacing * 0.83); side++) {
      let dark = 0;
      let samples = 0;
      for (let distance = Math.floor(spacing * 0.65); distance <= Math.floor(spacing * 2.8); distance++) {
        const row = y - direction * distance;
        if (row < 0 || row >= ink.length / width) break;
        dark += ink[row * width + x + direction * side];
        samples++;
      }
      if (samples >= Math.floor(spacing * 1.25) && dark >= samples * 0.6) return true;
    }
  }
  return false;
}

function findNotes({ width, height, pixels }: Raster, top: number, spacing: number, left: number, right: number) {
  const start = Math.max(0, Math.floor(top - spacing * 4.2));
  const end = Math.min(height, Math.ceil(top + spacing * 8.7));
  const firstX = Math.max(Math.floor(spacing * 1.5), left + Math.floor(spacing * 3.35));
  const lastX = Math.min(width - Math.floor(spacing * 1.5) - 1, right - Math.floor(spacing * 0.4));
  const ink = new Uint8Array((end - start) * width);
  for (let y = start; y < end; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const first = x;
      while (x < width && pixels[row + x] < 168) x++;
      // Mask horizontal staff lines and beams before matching noteheads.
      if (x - first <= Math.floor(spacing * 1.88)) ink.fill(1, (y - start) * width + first, (y - start) * width + x);
    }
  }
  const samples = template(spacing, width);
  const coverage = (offsets: number[], center: number) => {
    let count = 0;
    for (const offset of offsets) count += ink[center + offset];
    return count / Math.max(1, offsets.length);
  };
  const candidates: { x: number; y: number; step: number; hollow: boolean; strength: number }[] = [];
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
        if (solid && !hasStem(ink, width, x, y - start, spacing)) continue;
        candidates.push({
          x, y, step, hollow,
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
  return selected.sort((a, b) => a.x - b.x);
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
  const pixels = deskew({ width, height, pixels: gray });
  let staffImage = photo;
  if (pixels !== gray) {
    for (let i = 0; i < pixels.length; i++) {
      data.data[4 * i] = data.data[4 * i + 1] = data.data[4 * i + 2] = pixels[i];
    }
    ctx.putImageData(data, 0, 0);
    staffImage = canvas.toDataURL("image/jpeg", 0.86);
  }
  const raster = { width, height, pixels };
  const lines = findLines(raster);
  const staves: Staff[] = [];

  for (let i = 0; i + 4 < lines.length;) {
    const group = lines.slice(i, i + 5);
    const top = group[0].y;
    const spacing = (group[4].y - top) / 4;
    const left = group.map((line) => line.left).sort((a, b) => a - b)[2];
    const right = group.map((line) => line.right).sort((a, b) => a - b)[2];
    const regular = group.every((line, index) => Math.abs(line.y - top - spacing * index) <= Math.max(2, spacing * 0.15)
      && Math.abs(line.left - left) < width / 10 && Math.abs(line.right - right) < width / 10);
    if (!regular || spacing < 6 || spacing >= width / 8) {
      i++;
      continue;
    }
    i += 5;

    const x = Math.max(0, left - Math.ceil(width * 0.035));
    const y = Math.max(0, Math.floor(top - spacing * 3.8));
    const cropWidth = Math.min(width, right + Math.ceil(width * 0.035)) - x;
    const cropHeight = Math.min(height, Math.ceil(top + spacing * 9.1)) - y;
    const notes: Note[] = findNotes(raster, top, spacing, left, right).map((note) => ({
      id: crypto.randomUUID(), x: note.x - x, y: note.y - y, step: note.step,
      accidental: null, hollow: note.hollow,
    }));
    staves.push({
      image: staffImage, imageCrop: { x, y, width, height }, width: cropWidth, height: cropHeight,
      top: top - y, spacing, left: left - x, right: right - x, notes,
    });
  }
  if (!staves.length) throw new Error("No five-line staff found. Photograph a flat, well-lit page straight on.");
  return { staves, photo };
}
