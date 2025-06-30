import * as THREE from 'three';
import { WallGraph, WallEdge, WallNode } from './wall-graph';

export class WallMeshBuilder {
  constructor(private graph: WallGraph) {}

  buildUnifiedWallMesh(sharedCorners: Map<string, { x: number; y: number }>) {
    // Create a single geometry for all walls
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    
    // Vertex map to share vertices at corners
    const vertexMap = new Map<string, number>();
    let nextVertexIndex = 0;
    
    console.log(`Building unified mesh for ${this.graph.edges.size} wall edges`);
    
    // Helper to get or create vertex index
    const getVertexIndex = (x: number, y: number, z: number): number => {
      const key = `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100},${Math.round(z * 100) / 100}`;
      if (vertexMap.has(key)) {
        return vertexMap.get(key)!;
      }
      vertexMap.set(key, nextVertexIndex);
      vertices.push(x, z, y); // Three.js uses Y-up, so swap Y and Z
      uvs.push(0, 0); // Simple UV mapping
      return nextVertexIndex++;
    };
    
    // Helper to get shared corner point
    const getSharedCorner = (x: number, y: number) => {
      const key = `${Math.round(x * 1000) / 1000},${Math.round(y * 1000) / 1000}`;
      return sharedCorners.get(key) || { x, y };
    };
    
    // Process each wall edge
    for (const edge of this.graph.edges.values()) {
      console.log(`Processing wall edge ${edge.id}: (${edge.start.x},${edge.start.y}) to (${edge.end.x},${edge.end.y})`);
      
      const startPt = getSharedCorner(edge.start.x, edge.start.y);
      const endPt = getSharedCorner(edge.end.x, edge.end.y);
      
      // Calculate wall direction and perpendicular
      const dx = endPt.x - startPt.x;
      const dy = endPt.y - startPt.y;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      
      // Wall dimensions
      const thickness = edge.thickness;
      const height = edge.height;
      
      // Calculate wall corners (4 corners at each end)
      const halfThickness = thickness / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Perpendicular vector for thickness
      const perpX = -sin * halfThickness;
      const perpY = cos * halfThickness;
      
      // Start end corners (bottom)
      const startBL = { x: startPt.x - perpX, y: startPt.y - perpY }; // bottom-left
      const startBR = { x: startPt.x + perpX, y: startPt.y + perpY }; // bottom-right
      
      // End end corners (bottom)
      const endBL = { x: endPt.x - perpX, y: endPt.y - perpY }; // bottom-left
      const endBR = { x: endPt.x + perpX, y: endPt.y + perpY }; // bottom-right
      
      // Get vertex indices (shared at corners)
      const startBL_idx = getVertexIndex(startBL.x, startBL.y, 0);
      const startBR_idx = getVertexIndex(startBR.x, startBR.y, 0);
      const endBR_idx = getVertexIndex(endBR.x, endBR.y, 0);
      const endBL_idx = getVertexIndex(endBL.x, endBL.y, 0);
      
      const startTL_idx = getVertexIndex(startBL.x, startBL.y, height);
      const startTR_idx = getVertexIndex(startBR.x, startBR.y, height);
      const endTR_idx = getVertexIndex(endBR.x, endBR.y, height);
      const endTL_idx = getVertexIndex(endBL.x, endBL.y, height);
      
      // Add indices for this wall (6 faces: front, back, left, right, top, bottom)
      // Front face (facing positive Z)
      indices.push(startBL_idx, startBR_idx, endBR_idx);
      indices.push(startBL_idx, endBR_idx, endBL_idx);
      
      // Back face (facing negative Z)
      indices.push(startTL_idx, endTR_idx, startTR_idx);
      indices.push(startTL_idx, endTL_idx, endTR_idx);
      
      // Left face
      indices.push(startBL_idx, endBL_idx, endTL_idx);
      indices.push(startBL_idx, endTL_idx, startTL_idx);
      
      // Right face
      indices.push(startBR_idx, startTR_idx, endTR_idx);
      indices.push(startBR_idx, endTR_idx, endBR_idx);
      
      // Top face
      indices.push(startTL_idx, startTR_idx, endTR_idx);
      indices.push(startTL_idx, endTR_idx, endTL_idx);
      
      // Bottom face
      indices.push(startBL_idx, endBR_idx, startBR_idx);
      indices.push(startBL_idx, endBL_idx, endBR_idx);
    }
    
    console.log(`Created unified mesh with ${vertices.length / 3} vertices, ${indices.length} indices, ${vertexMap.size} unique vertex positions`);
    
    // Set geometry attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    // Create material and mesh
    const material = new THREE.MeshLambertMaterial({ 
      color: 0xbca18c,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
  }

  // Legacy method for individual meshes (kept for compatibility)
  buildWallMesh(edge: WallEdge, sharedCorners: Map<string, { x: number; y: number }>) {
    const getKey = (x: number, y: number) => `${Math.round(x * 1000) / 1000},${Math.round(y * 1000) / 1000}`;
    const startPt = sharedCorners.get(getKey(edge.start.x, edge.start.y)) || { x: edge.start.x, y: edge.start.y };
    const endPt = sharedCorners.get(getKey(edge.end.x, edge.end.y)) || { x: edge.end.x, y: edge.end.y };
    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const length = Math.hypot(dx, dy);
    const geometry = new THREE.BoxGeometry(length, edge.height, edge.thickness);
    const material = new THREE.MeshLambertMaterial({ color: 0xbca18c });
    const wall = new THREE.Mesh(geometry, material);
    const midX = (startPt.x + endPt.x) / 2;
    const midZ = (startPt.y + endPt.y) / 2;
    wall.position.set(midX, edge.height / 2, midZ);
    const angle = Math.atan2(dy, dx);
    wall.rotation.y = angle;
    wall.castShadow = true;
    wall.receiveShadow = true;
    return wall;
  }

  buildAllMeshes(sharedCorners: Map<string, { x: number; y: number }>) {
    // Use unified mesh approach for perfect joins
    return [this.buildUnifiedWallMesh(sharedCorners)];
  }
} 