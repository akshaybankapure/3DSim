import { FloorplanElement } from './store/floorplanStore'

export const demoFloorplan: FloorplanElement[] = [
  // Outer walls
  {
    id: 'wall_1',
    type: 'wall',
    start: { x: 100, y: 100 },
    end: { x: 400, y: 100 },
    properties: { width: 10, height: 200 }
  },
  {
    id: 'wall_2',
    type: 'wall',
    start: { x: 400, y: 100 },
    end: { x: 400, y: 300 },
    properties: { width: 10, height: 200 }
  },
  {
    id: 'wall_3',
    type: 'wall',
    start: { x: 400, y: 300 },
    end: { x: 100, y: 300 },
    properties: { width: 10, height: 200 }
  },
  {
    id: 'wall_4',
    type: 'wall',
    start: { x: 100, y: 300 },
    end: { x: 100, y: 100 },
    properties: { width: 10, height: 200 }
  },
  
  // Interior walls
  {
    id: 'wall_5',
    type: 'wall',
    start: { x: 100, y: 200 },
    end: { x: 300, y: 200 },
    properties: { width: 10, height: 200 }
  },
  {
    id: 'wall_6',
    type: 'wall',
    start: { x: 300, y: 100 },
    end: { x: 300, y: 200 },
    properties: { width: 10, height: 200 }
  },
  
  // Doors - positioned along walls using parentWallId and positionOnWall
  {
    id: 'door_1',
    type: 'door',
    parentWallId: 'wall_1', // Top wall (100,100) to (400,100)
    positionOnWall: 0.5, // Middle of the wall (250,100)
    width: 80,
    height: 200,
    properties: { width: 80, height: 200 }
  },
  {
    id: 'door_2',
    type: 'door',
    parentWallId: 'wall_5', // Interior wall (100,200) to (300,200)
    positionOnWall: 0.5, // Middle of the wall (200,200)
    width: 80,
    height: 200,
    properties: { width: 80, height: 200 }
  },
  
  // Windows - positioned along walls using parentWallId and positionOnWall
  {
    id: 'window_1',
    type: 'window',
    parentWallId: 'wall_1', // Top wall (100,100) to (400,100)
    positionOnWall: 0.167, // About 1/6 from start (150,100)
    width: 80,
    height: 80,
    properties: { width: 80, height: 80 }
  },
  {
    id: 'window_2',
    type: 'window',
    parentWallId: 'wall_3', // Bottom wall (400,300) to (100,300)
    positionOnWall: 0.167, // About 1/6 from start (350,300)
    width: 80,
    height: 80,
    properties: { width: 80, height: 80 }
  }
] 