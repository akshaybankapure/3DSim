import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type ElementType = 'wall' | 'door' | 'window'

export interface Point {
  x: number
  y: number
  z?: number
}

export interface FloorplanElement {
  id: string
  type: ElementType
  // For walls:
  start?: Point
  end?: Point
  // For doors/windows:
  parentWallId?: string
  positionOnWall?: number // 0-1, percentage along wall
  width?: number
  height?: number
  properties: {
    [key: string]: any
  }
}

export interface FloorplanState {
  // Elements
  elements: FloorplanElement[]
  selectedElement: FloorplanElement | null
  
  // Tools
  activeTool: ElementType | null
  isDrawing: boolean
  drawingStart: Point | null
  
  // View
  viewMode: '2D' | '3D'
  
  // Undo/Redo
  history: FloorplanElement[][]
  historyIndex: number
  maxHistorySize: number
  
  // Actions
  setActiveTool: (tool: ElementType | null) => void
  addElement: (element: FloorplanElement) => void
  updateElement: (id: string, updates: Partial<FloorplanElement>) => void
  deleteElement: (id: string) => void
  selectElement: (element: FloorplanElement | null) => void
  setDrawingState: (isDrawing: boolean, start?: Point) => void
  setViewMode: (mode: '2D' | '3D') => void
  
  // Undo/Redo Actions
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  
  // Save/Load
  saveFloorplan: () => string
  loadFloorplan: (data: string) => void
  clearFloorplan: () => void
}

export const useFloorplanStore = create<FloorplanState>()(
  devtools(
    (set, get) => ({
      // Initial state
      elements: [],
      selectedElement: null,
      activeTool: null,
      isDrawing: false,
      drawingStart: null,
      viewMode: '2D',
      history: [[]],
      historyIndex: 0,
      maxHistorySize: 50,
      
      // Actions
      setActiveTool: (tool: ElementType | null) => set({ activeTool: tool }),
      
      addElement: (element: FloorplanElement) => {
        const state = get()
        const newElements = [...state.elements, element]
        set((state) => ({
          elements: newElements,
          history: [...state.history.slice(0, state.historyIndex + 1), newElements].slice(-state.maxHistorySize),
          historyIndex: Math.min(state.historyIndex + 1, state.maxHistorySize - 1)
        }))
      },
      
      updateElement: (id: string, updates: Partial<FloorplanElement>) => {
        const state = get()
        const newElements = state.elements.map(el => 
          el.id === id ? { ...el, ...updates } : el
        )
        set((state) => ({
          elements: newElements,
          history: [...state.history.slice(0, state.historyIndex + 1), newElements].slice(-state.maxHistorySize),
          historyIndex: Math.min(state.historyIndex + 1, state.maxHistorySize - 1)
        }))
      },
      
      deleteElement: (id: string) => {
        const state = get()
        const newElements = state.elements.filter(el => el.id !== id)
        set((state) => ({
          elements: newElements,
          selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
          history: [...state.history.slice(0, state.historyIndex + 1), newElements].slice(-state.maxHistorySize),
          historyIndex: Math.min(state.historyIndex + 1, state.maxHistorySize - 1)
        }))
      },
      
      selectElement: (element: FloorplanElement | null) => set({ selectedElement: element }),
      
      setDrawingState: (isDrawing: boolean, start?: Point) => set({ 
        isDrawing, 
        drawingStart: start || null 
      }),
      
      setViewMode: (mode: '2D' | '3D') => set({ viewMode: mode }),
      
      // Undo/Redo Actions
      undo: () => {
        const state = get()
        if (state.historyIndex > 0) {
          const newIndex = state.historyIndex - 1
          set({
            elements: state.history[newIndex],
            historyIndex: newIndex,
            selectedElement: null // Clear selection on undo
          })
        }
      },
      
      redo: () => {
        const state = get()
        if (state.historyIndex < state.history.length - 1) {
          const newIndex = state.historyIndex + 1
          set({
            elements: state.history[newIndex],
            historyIndex: newIndex,
            selectedElement: null // Clear selection on redo
          })
        }
      },
      
      canUndo: () => {
        const state = get()
        return state.historyIndex > 0
      },
      
      canRedo: () => {
        const state = get()
        return state.historyIndex < state.history.length - 1
      },
      
      saveFloorplan: () => {
        const state = get()
        const data = {
          elements: state.elements,
          version: '1.0'
        }
        return JSON.stringify(data)
      },
      
      loadFloorplan: (data: string) => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.elements && Array.isArray(parsed.elements)) {
            set((state) => ({
              elements: parsed.elements,
              history: [parsed.elements],
              historyIndex: 0,
              selectedElement: null
            }))
          }
        } catch (error) {
          console.error('Failed to load floorplan:', error)
        }
      },
      
      clearFloorplan: () => set((state) => ({ 
        elements: [], 
        selectedElement: null,
        isDrawing: false,
        drawingStart: null,
        history: [[]],
        historyIndex: 0
      }))
    }),
    {
      name: 'floorplan-store'
    }
  )
) 