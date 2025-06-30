import { WallNode, WallEdge } from './wall-graph'

export function perpendicular(v: { x: number; y: number }) {
  return { x: -v.y, y: v.x };
}

export function lineIntersection(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number }
): { x: number; y: number } | null {
  const da = { x: a2.x - a1.x, y: a2.y - a1.y };
  const db = { x: b2.x - b1.x, y: b2.y - b1.y };
  const det = da.x * db.y - da.y * db.x;
  if (Math.abs(det) < 1e-8) return null;
  const t = ((b1.x - a1.x) * db.y - (b1.y - a1.y) * db.x) / det;
  return { x: a1.x + t * da.x, y: a1.y + t * da.y };
}

export function computeSharedCorner(node: WallNode, edges: WallEdge[]): { x: number; y: number } {
  const { x, y } = node;
  if (edges.length === 1) {
    // Open end: offset by half thickness outward
    const edge = edges[0];
    const isStart = edge.start === node;
    const wallVec = isStart
      ? { x: edge.end.x - edge.start.x, y: edge.end.y - edge.start.y }
      : { x: edge.start.x - edge.end.x, y: edge.start.y - edge.end.y };
    const wallLen = Math.hypot(wallVec.x, wallVec.y);
    const wallDir = wallLen === 0 ? { x: 0, y: 0 } : { x: wallVec.x / wallLen, y: wallVec.y / wallLen };
    const wallThickness = edge.thickness;
    return {
      x: x - wallDir.x * wallThickness / 2,
      y: y - wallDir.y * wallThickness / 2
    };
  }
  // For 2+ walls: intersect offset lines
  let intersections: { x: number; y: number }[] = [];
  for (let i = 0; i < edges.length; i++) {
    const e1 = edges[i];
    const isStart1 = e1.start === node;
    const v1 = isStart1
      ? { x: e1.end.x - e1.start.x, y: e1.end.y - e1.start.y }
      : { x: e1.start.x - e1.end.x, y: e1.start.y - e1.end.y };
    const len1 = Math.hypot(v1.x, v1.y);
    if (len1 === 0) continue;
    const dir1 = { x: v1.x / len1, y: v1.y / len1 };
    const perp1 = perpendicular(dir1);
    const t1 = e1.thickness;
    const offset1 = { x: x + perp1.x * t1 / 2, y: y + perp1.y * t1 / 2 };
    for (let j = i + 1; j < edges.length; j++) {
      const e2 = edges[j];
      const isStart2 = e2.start === node;
      const v2 = isStart2
        ? { x: e2.end.x - e2.start.x, y: e2.end.y - e2.start.y }
        : { x: e2.start.x - e2.end.x, y: e2.start.y - e2.end.y };
      const len2 = Math.hypot(v2.x, v2.y);
      if (len2 === 0) continue;
      const dir2 = { x: v2.x / len2, y: v2.y / len2 };
      const perp2 = perpendicular(dir2);
      const t2 = e2.thickness;
      const offset2 = { x: x + perp2.x * t2 / 2, y: y + perp2.y * t2 / 2 };
      const intersect = lineIntersection(
        offset1, { x: offset1.x + dir1.x, y: offset1.y + dir1.y },
        offset2, { x: offset2.x + dir2.x, y: offset2.y + dir2.y }
      );
      if (intersect) intersections.push(intersect);
    }
  }
  if (intersections.length > 0) {
    const avg = intersections.reduce((acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }), { x: 0, y: 0 });
    return { x: avg.x / intersections.length, y: avg.y / intersections.length };
  } else {
    return { x, y };
  }
} 