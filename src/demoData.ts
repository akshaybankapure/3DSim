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
  
  // Doors
  {
    id: 'door_1',
    type: 'door',
    start: { x: 250, y: 100 },
    end: { x: 250, y: 100 },
    properties: { width: 80, height: 200 }
  },
  {
    id: 'door_2',
    type: 'door',
    start: { x: 200, y: 200 },
    end: { x: 200, y: 200 },
    properties: { width: 80, height: 200 }
  },
  
  // Windows
  {
    id: 'window_1',
    type: 'window',
    start: { x: 150, y: 100 },
    end: { x: 150, y: 100 },
    properties: { width: 80, height: 200 }
  },
  {
    id: 'window_2',
    type: 'window',
    start: { x: 350, y: 300 },
    end: { x: 350, y: 300 },
    properties: { width: 80, height: 200 }
  }
] 