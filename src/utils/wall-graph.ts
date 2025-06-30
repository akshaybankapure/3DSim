import { FloorplanElement } from '../store/floorplanStore'

export type WallNode = {
  id: string;
  x: number;
  y: number;
  edges: WallEdge[];
};

export type WallEdge = {
  id: string;
  start: WallNode;
  end: WallNode;
  thickness: number;
  height: number;
  element: FloorplanElement;
};

export class WallGraph {
  nodes: Map<string, WallNode> = new Map();
  edges: Map<string, WallEdge> = new Map();

  constructor(elements: FloorplanElement[]) {
    const nodeMap: Map<string, WallNode> = new Map();
    const getNodeKey = (x: number, y: number) => `${Math.round(x * 1000) / 1000},${Math.round(y * 1000) / 1000}`;
    // Build nodes
    for (const el of elements) {
      if (el.type !== 'wall' || !el.start || !el.end) continue;
      for (const pt of [el.start, el.end]) {
        const key = getNodeKey(pt.x, pt.y);
        if (!nodeMap.has(key)) {
          nodeMap.set(key, { id: key, x: pt.x, y: pt.y, edges: [] });
        }
      }
    }
    // Build edges
    for (const el of elements) {
      if (el.type !== 'wall' || !el.start || !el.end) continue;
      const startKey = getNodeKey(el.start.x, el.start.y);
      const endKey = getNodeKey(el.end.x, el.end.y);
      const startNode = nodeMap.get(startKey)!;
      const endNode = nodeMap.get(endKey)!;
      const edge: WallEdge = {
        id: el.id,
        start: startNode,
        end: endNode,
        thickness: el.properties.width || 10,
        height: el.properties.height || 200,
        element: el
      };
      startNode.edges.push(edge);
      endNode.edges.push(edge);
      this.edges.set(edge.id, edge);
    }
    for (const [key, node] of nodeMap.entries()) {
      this.nodes.set(key, node);
    }
  }
} 