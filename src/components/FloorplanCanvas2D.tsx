import React, { useRef, useEffect, useCallback } from 'react'
import { useFloorplanStore, FloorplanElement, Point } from '../store/floorplanStore'

const FloorplanCanvas2D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    elements,
    selectedElement,
    activeTool,
    isDrawing,
    drawingStart,
    setDrawingState,
    addElement,
    selectElement
  } = useFloorplanStore()

  // Generate unique ID
  const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Convert screen coordinates to canvas coordinates
  const getCanvasCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    }
  }, [])

  // Snap to grid
  const snapToGrid = useCallback((point: Point, gridSize: number = 20): Point => {
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    }
  }, [])

  // Find nearest wall endpoint for corner detection
  const findNearestEndpoint = useCallback((point: Point, threshold: number = 15): Point | null => {
    let nearestPoint: Point | null = null
    let minDistance = threshold

    elements.forEach(element => {
      const startDist = Math.sqrt(
        Math.pow(point.x - element.start.x, 2) + Math.pow(point.y - element.start.y, 2)
      )
      const endDist = Math.sqrt(
        Math.pow(point.x - element.end.x, 2) + Math.pow(point.y - element.end.y, 2)
      )

      if (startDist < minDistance) {
        minDistance = startDist
        nearestPoint = element.start
      }
      if (endDist < minDistance) {
        minDistance = endDist
        nearestPoint = element.end
      }
    })

    return nearestPoint
  }, [elements])

  // Handle mouse down
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeTool) return
    
    const coords = getCanvasCoordinates(event)
    const snappedCoords = snapToGrid(coords)
    const nearestEndpoint = findNearestEndpoint(snappedCoords)
    
    // Use nearest endpoint if found, otherwise use snapped coordinates
    const startPoint = nearestEndpoint || snappedCoords
    setDrawingState(true, startPoint)
  }, [activeTool, getCanvasCoordinates, snapToGrid, findNearestEndpoint, setDrawingState])

  // Handle mouse move
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingStart || !activeTool) return
    
    const coords = getCanvasCoordinates(event)
    const snappedCoords = snapToGrid(coords)
    const nearestEndpoint = findNearestEndpoint(snappedCoords)
    
    // Use nearest endpoint if found, otherwise use snapped coordinates
    const endPoint = nearestEndpoint || snappedCoords
    
    // Redraw canvas with preview line
    drawCanvas(endPoint)
  }, [isDrawing, drawingStart, activeTool, getCanvasCoordinates, snapToGrid, findNearestEndpoint])

  // Handle mouse up
  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingStart || !activeTool) return
    
    const coords = getCanvasCoordinates(event)
    const snappedCoords = snapToGrid(coords)
    const nearestEndpoint = findNearestEndpoint(snappedCoords)
    
    // Use nearest endpoint if found, otherwise use snapped coordinates
    const endPoint = nearestEndpoint || snappedCoords
    
    // Don't create element if start and end are the same
    if (drawingStart.x === endPoint.x && drawingStart.y === endPoint.y) {
      setDrawingState(false)
      return
    }
    
    // Create new element
    const newElement: FloorplanElement = {
      id: generateId(),
      type: activeTool,
      start: drawingStart,
      end: endPoint,
      properties: {
        width: activeTool === 'wall' ? 10 : 80,
        height: activeTool === 'wall' ? 200 : 200
      }
    }
    
    addElement(newElement)
    setDrawingState(false)
  }, [isDrawing, drawingStart, activeTool, getCanvasCoordinates, snapToGrid, findNearestEndpoint, addElement, setDrawingState])

  // Handle click for selection
  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool) return // Don't select when drawing
    
    const coords = getCanvasCoordinates(event)
    const clickedElement = findElementAtPoint(coords)
    selectElement(clickedElement)
  }, [activeTool, getCanvasCoordinates, selectElement])

  // Find element at point with wall thickness consideration
  const findElementAtPoint = useCallback((point: Point): FloorplanElement | null => {
    for (const element of elements) {
      const thickness = element.properties.width || 10
      const threshold = Math.max(thickness / 2, 10) // Use wall thickness or minimum threshold
      
      if (isPointNearLine(point, element.start, element.end, threshold)) {
        return element
      }
    }
    return null
  }, [elements])

  // Check if point is near line with improved algorithm
  const isPointNearLine = (point: Point, start: Point, end: Point, threshold: number): boolean => {
    const A = point.x - start.x
    const B = point.y - start.y
    const C = end.x - start.x
    const D = end.y - start.y

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    
    if (lenSq === 0) return false
    
    let param = dot / lenSq
    param = Math.max(0, Math.min(1, param))

    const xx = start.x + param * C
    const yy = start.y + param * D

    const dx = point.x - xx
    const dy = point.y - yy
    
    return Math.sqrt(dx * dx + dy * dy) <= threshold
  }

  // Draw canvas
  const drawCanvas = useCallback((previewEnd?: Point) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    
    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height)
    
    // Draw elements
    elements.forEach(element => {
      drawElement(ctx, element, element.id === selectedElement?.id)
    })
    
    // Draw preview line
    if (isDrawing && drawingStart && previewEnd && activeTool) {
      ctx.strokeStyle = '#007bff'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(drawingStart.x, drawingStart.y)
      ctx.lineTo(previewEnd.x, previewEnd.y)
      ctx.stroke()
      ctx.setLineDash([])
    }
    
    // Draw corner indicators
    drawCornerIndicators(ctx)
  }, [elements, selectedElement, isDrawing, drawingStart, activeTool])

  // Draw grid
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }

  // Draw element with thickness
  const drawElement = (ctx: CanvasRenderingContext2D, element: FloorplanElement, isSelected: boolean) => {
    const { start, end, type, properties } = element
    const thickness = properties.width || 10
    
    ctx.strokeStyle = isSelected ? '#ff6b6b' : '#333'
    ctx.lineWidth = thickness
    
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
    
    // Draw element type indicator
    if (type === 'door') {
      drawDoor2D(ctx, start, end, thickness)
    } else if (type === 'window') {
      drawWindow2D(ctx, start, end, thickness)
    }
  }

  // Draw door as a rectangle centered on the wall
  const drawDoor2D = (ctx: CanvasRenderingContext2D, start: Point, end: Point, wallThickness: number) => {
    const doorWidth = 40
    const doorThickness = wallThickness * 1.5
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    
    ctx.save()
    ctx.translate(midX, midY)
    ctx.rotate(angle)
    ctx.fillStyle = '#8bc34a'
    ctx.fillRect(-doorWidth/2, -doorThickness/2, doorWidth, doorThickness)
    ctx.restore()
  }

  // Draw window as a rectangle centered on the wall
  const drawWindow2D = (ctx: CanvasRenderingContext2D, start: Point, end: Point, wallThickness: number) => {
    const windowWidth = 40
    const windowThickness = wallThickness * 1.2
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    
    ctx.save()
    ctx.translate(midX, midY)
    ctx.rotate(angle)
    ctx.fillStyle = '#2196f3'
    ctx.globalAlpha = 0.7
    ctx.fillRect(-windowWidth/2, -windowThickness/2, windowWidth, windowThickness)
    ctx.globalAlpha = 1.0
    ctx.restore()
  }

  // Draw corner indicators
  const drawCornerIndicators = (ctx: CanvasRenderingContext2D) => {
    const corners = new Set<string>()
    
    elements.forEach(element => {
      corners.add(`${element.start.x},${element.start.y}`)
      corners.add(`${element.end.x},${element.end.y}`)
    })
    
    ctx.fillStyle = '#ff9800'
    corners.forEach(cornerStr => {
      const [x, y] = cornerStr.split(',').map(Number)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fill()
    })
  }

  // Redraw canvas when elements change
  useEffect(() => {
    drawCanvas()
  }, [elements, selectedElement, drawCanvas])

  return (
    <canvas
      ref={canvasRef}
      className="floorplan-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      style={{
        width: '100%',
        height: '100%',
        cursor: activeTool ? 'crosshair' : 'default'
      }}
    />
  )
}

export default FloorplanCanvas2D 