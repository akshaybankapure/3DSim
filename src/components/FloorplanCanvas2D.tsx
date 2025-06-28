import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useFloorplanStore, FloorplanElement, Point } from '../store/floorplanStore'

const FloorplanCanvas2D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
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

  // Initialize canvas size
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const newSize = { width: rect.width, height: rect.height }
    
    // Only update if size actually changed
    if (canvasSize.width !== newSize.width || canvasSize.height !== newSize.height) {
      canvas.width = newSize.width
      canvas.height = newSize.height
      setCanvasSize(newSize)
    }
  }, [canvasSize])

  // Convert screen coordinates to canvas coordinates with improved precision
  const getCanvasCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: Math.round((event.clientX - rect.left) * scaleX),
      y: Math.round((event.clientY - rect.top) * scaleY)
    }
  }, [])

  // Improved snap to grid with better precision
  const snapToGrid = useCallback((point: Point, gridSize: number = 20): Point => {
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    }
  }, [])

  // Find nearest wall endpoint for corner detection with improved threshold
  const findNearestEndpoint = useCallback((point: Point, threshold: number = 20): Point | null => {
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
        nearestPoint = { x: element.start.x, y: element.start.y }
      }
      if (endDist < minDistance) {
        minDistance = endDist
        nearestPoint = { x: element.end.x, y: element.end.y }
      }
    })

    return nearestPoint
  }, [elements])

  // Handle mouse down with improved coordinate handling
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeTool) return
    
    const coords = getCanvasCoordinates(event)
    const snappedCoords = snapToGrid(coords)
    const nearestEndpoint = findNearestEndpoint(snappedCoords)
    
    // Use nearest endpoint if found, otherwise use snapped coordinates
    const startPoint = nearestEndpoint || snappedCoords
    setDrawingState(true, startPoint)
  }, [activeTool, getCanvasCoordinates, snapToGrid, findNearestEndpoint, setDrawingState])

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

  // Get current mouse position (for grid snap indicators)
  const [mousePosition, setMousePosition] = useState<Point | null>(null)
  
  const getMousePosition = useCallback((): Point | null => {
    return mousePosition
  }, [mousePosition])

  // Draw canvas with improved performance
  const drawCanvas = useCallback((previewEnd?: Point) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height)
    
    // Draw elements
    elements.forEach(element => {
      drawElement(ctx, element, element.id === selectedElement?.id)
    })
    
    // Draw preview line with improved visual feedback
    if (isDrawing && drawingStart && previewEnd && activeTool) {
      // Draw snap indicator if snapping to endpoint
      const nearestEndpoint = findNearestEndpoint(previewEnd)
      if (nearestEndpoint) {
        ctx.fillStyle = '#007bff'
        ctx.beginPath()
        ctx.arc(nearestEndpoint.x, nearestEndpoint.y, 6, 0, 2 * Math.PI)
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      
      // Draw preview line
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
    
    // Draw grid snap indicators for current mouse position (when not drawing)
    if (!isDrawing && activeTool) {
      const mousePos = getMousePosition()
      if (mousePos) {
        const snappedPos = snapToGrid(mousePos)
        ctx.fillStyle = 'rgba(0, 123, 255, 0.3)'
        ctx.beginPath()
        ctx.arc(snappedPos.x, snappedPos.y, 3, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
  }, [elements, selectedElement, isDrawing, drawingStart, activeTool, findNearestEndpoint, getMousePosition, snapToGrid])

  // Handle mouse move for grid snap indicators
  const handleMouseMoveGlobal = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle drawing preview
    if (isDrawing && drawingStart && activeTool) {
      const coords = getCanvasCoordinates(event)
      const snappedCoords = snapToGrid(coords)
      const nearestEndpoint = findNearestEndpoint(snappedCoords)
      const endPoint = nearestEndpoint || snappedCoords
      drawCanvas(endPoint)
    }
    
    // Handle grid snap indicators when not drawing
    if (activeTool && !isDrawing) {
      const coords = getCanvasCoordinates(event)
      setMousePosition(coords)
      drawCanvas()
    }
  }, [isDrawing, drawingStart, activeTool, getCanvasCoordinates, snapToGrid, findNearestEndpoint, drawCanvas])

  // Handle mouse up with improved validation
  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingStart || !activeTool) return
    
    const coords = getCanvasCoordinates(event)
    const snappedCoords = snapToGrid(coords)
    const nearestEndpoint = findNearestEndpoint(snappedCoords)
    
    // Use nearest endpoint if found, otherwise use snapped coordinates
    const endPoint = nearestEndpoint || snappedCoords
    
    // Don't create element if start and end are the same or too close
    const distance = Math.sqrt(
      Math.pow(drawingStart.x - endPoint.x, 2) + Math.pow(drawingStart.y - endPoint.y, 2)
    )
    if (distance < 10) {
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

  // Find element at point with improved wall thickness consideration
  const findElementAtPoint = useCallback((point: Point): FloorplanElement | null => {
    for (const element of elements) {
      const thickness = element.properties.width || 10
      const threshold = Math.max(thickness / 2, 8) // Slightly reduced minimum threshold
      
      if (isPointNearLine(point, element.start, element.end, threshold)) {
        return element
      }
    }
    return null
  }, [elements])

  // Draw grid with improved visual clarity
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 0.5 // Thinner lines for better visual clarity
    
    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    // Draw grid intersection points for better visual reference
    ctx.fillStyle = '#d0d0d0'
    for (let x = 0; x <= width; x += gridSize) {
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, 2 * Math.PI)
        ctx.fill()
      }
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

  // Draw corner indicators with improved visibility
  const drawCornerIndicators = (ctx: CanvasRenderingContext2D) => {
    const corners = new Set<string>()
    
    elements.forEach(element => {
      corners.add(`${Math.round(element.start.x)},${Math.round(element.start.y)}`)
      corners.add(`${Math.round(element.end.x)},${Math.round(element.end.y)}`)
    })
    
    ctx.fillStyle = '#ff9800'
    ctx.strokeStyle = '#e65100'
    ctx.lineWidth = 1
    
    corners.forEach(cornerStr => {
      const [x, y] = cornerStr.split(',').map(Number)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
    })
  }

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setMousePosition(null)
    drawCanvas()
  }, [drawCanvas])

  // Initialize canvas on mount
  useEffect(() => {
    initializeCanvas()
  }, [initializeCanvas])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      initializeCanvas()
      drawCanvas()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [initializeCanvas, drawCanvas])

  // Redraw canvas when elements change
  useEffect(() => {
    drawCanvas()
  }, [elements, selectedElement, drawCanvas])

  return (
    <canvas
      ref={canvasRef}
      className="floorplan-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMoveGlobal}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        height: '100%',
        cursor: activeTool ? 'crosshair' : 'default',
        display: 'block' // Ensure no extra spacing
      }}
    />
  )
}

export default FloorplanCanvas2D 