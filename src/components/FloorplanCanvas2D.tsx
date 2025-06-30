import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useFloorplanStore, FloorplanElement, Point } from '../store/floorplanStore'

const MIN_ZOOM = 0.2
const MAX_ZOOM = 4
const ZOOM_STEP = 0.1

const FloorplanCanvas2D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null)
  const [spacePressed, setSpacePressed] = useState(false)
  const {
    elements,
    selectedElement,
    activeTool,
    isDrawing,
    drawingStart,
    setDrawingState,
    addElement,
    selectElement,
    updateElement
  } = useFloorplanStore()

  // Drag state for moving elements
  const [isDraggingElement, setIsDraggingElement] = useState(false)
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  
  // Wall endpoint editing state
  const [isDraggingEndpoint, setIsDraggingEndpoint] = useState(false)
  const [draggedEndpoint, setDraggedEndpoint] = useState<'start' | 'end' | null>(null)
  const [endpointDragOffset, setEndpointDragOffset] = useState<{ x: number; y: number } | null>(null)

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

  // Convert screen coordinates to canvas coordinates (with zoom/pan)
  const getCanvasCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    // Adjust for pan and zoom
    const x = ((event.clientX - rect.left) * scaleX - pan.x) / zoom
    const y = ((event.clientY - rect.top) * scaleY - pan.y) / zoom
    return { x, y }
  }, [pan, zoom])

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
      if (!element.start || !element.end) return
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

  // Check if point is near a wall endpoint
  const isPointNearEndpoint = useCallback((point: Point, endpoint: Point, threshold: number = 8): boolean => {
    const dist = Math.hypot(point.x - endpoint.x, point.y - endpoint.y)
    return dist <= threshold
  }, [])

  // Handle mouse down with improved coordinate handling
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeTool) return
    
    const coords = getCanvasCoordinates(event)
    const snappedCoords = snapToGrid(coords)
    
    if (activeTool === 'wall') {
      // For walls: start drawing from snapped point or nearest endpoint
      const nearestEndpoint = findNearestEndpoint(snappedCoords)
      const startPoint = nearestEndpoint || snappedCoords
      setDrawingState(true, startPoint)
    } else if (activeTool === 'door' || activeTool === 'window') {
      // For doors/windows: start drawing immediately (single-click placement)
      setDrawingState(true, snappedCoords)
    }
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

  // Mouse wheel for zoom
  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mouseX = (event.clientX - rect.left) * (canvas.width / rect.width)
    const mouseY = (event.clientY - rect.top) * (canvas.height / rect.height)
    const zoomDir = event.deltaY < 0 ? 1 : -1
    let newZoom = zoom + zoomDir * ZOOM_STEP * zoom
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
    // Adjust pan so zoom is centered on mouse
    const wx = (mouseX - pan.x) / zoom
    const wy = (mouseY - pan.y) / zoom
    const newPanX = mouseX - wx * newZoom
    const newPanY = mouseY - wy * newZoom
    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }, [zoom, pan])

  // Mouse down for pan
  const handleMouseDownPan = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button === 1 || event.button === 2 || spacePressed) {
      setIsPanning(true)
      setPanStart({ x: event.clientX, y: event.clientY })
    }
  }, [spacePressed])

  // Mouse move for pan
  const handleMouseMovePan = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && panStart) {
      const dx = event.clientX - panStart.x
      const dy = event.clientY - panStart.y
      setPan(p => ({ x: p.x + dx, y: p.y + dy }))
      setPanStart({ x: event.clientX, y: event.clientY })
    }
  }, [isPanning, panStart])

  // Mouse up for pan
  const handleMouseUpPan = useCallback(() => {
    setIsPanning(false)
    setPanStart(null)
  }, [])

  // Keyboard for spacebar pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Draw canvas with improved performance and door/window preview
  const drawCanvas = useCallback((previewEnd?: Point, doorWindowPreview?: { wall?: FloorplanElement, positionOnWall?: number, point?: Point }) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // Apply pan and zoom
    ctx.save()
    ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y)
    drawGrid(ctx, canvas.width / zoom, canvas.height / zoom)
    elements.forEach(element => {
      drawElement(ctx, element, element.id === selectedElement?.id)
    })
    
    // Draw preview elements
    if (isDrawing && drawingStart && activeTool) {
      if (activeTool === 'wall' && previewEnd) {
        // Wall drawing preview
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
        ctx.strokeStyle = '#007bff'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(drawingStart.x, drawingStart.y)
        ctx.lineTo(previewEnd.x, previewEnd.y)
        ctx.stroke()
        ctx.setLineDash([])
      } else if ((activeTool === 'door' || activeTool === 'window') && doorWindowPreview?.wall && doorWindowPreview?.positionOnWall !== undefined && doorWindowPreview?.point) {
        // Door/window placement preview
        const { wall, positionOnWall, point } = doorWindowPreview
        if (wall.start && wall.end) {
          const { start, end } = wall
          const t = positionOnWall
          const cx = start.x + (end.x - start.x) * t
          const cy = start.y + (end.y - start.y) * t
          const angle = Math.atan2(end.y - start.y, end.x - start.x)
          const thickness = wall.properties?.width || 10
          
          // Draw preview door/window
          if (activeTool === 'door') {
            drawDoor2D(ctx, { x: cx, y: cy }, angle, thickness, false)
          } else {
            drawWindow2D(ctx, { x: cx, y: cy }, angle, thickness, false)
          }
          
          // Draw placement indicator
          ctx.fillStyle = '#007bff'
          ctx.beginPath()
          ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI)
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
    }
    
    drawCornerIndicators(ctx)
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
    ctx.restore()
    // Draw axes for direction (bottom-right corner)
    drawAxes(ctx)
  }, [elements, selectedElement, isDrawing, drawingStart, activeTool, findNearestEndpoint, getMousePosition, snapToGrid, pan, zoom, canvasSize])

  // Handle mouse move for grid snap indicators and drawing preview
  const handleMouseMoveGlobal = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle drawing preview
    if (isDrawing && drawingStart && activeTool) {
      const coords = getCanvasCoordinates(event)
      const snappedCoords = snapToGrid(coords)
      
      if (activeTool === 'wall') {
        // Wall drawing preview
        const nearestEndpoint = findNearestEndpoint(snappedCoords)
        const endPoint = nearestEndpoint || snappedCoords
        drawCanvas(endPoint)
      } else if (activeTool === 'door' || activeTool === 'window') {
        // Door/window placement preview
        const elementsList: FloorplanElement[] = elements;
        let nearestWall: FloorplanElement | undefined = undefined;
        let minDist = 30;
        let bestT: number | undefined = undefined;
        let bestPoint: Point | undefined = undefined;
        elementsList.forEach((el) => {
          if (el.type === 'wall' && el.start && el.end && typeof el.id === 'string') {
            const { positionOnWall, closestPoint } = projectPointToWall(snappedCoords, el);
            const dist = Math.hypot(snappedCoords.x - closestPoint.x, snappedCoords.y - closestPoint.y);
            if (dist < minDist) {
              minDist = dist;
              nearestWall = el;
              bestT = positionOnWall;
              bestPoint = closestPoint;
            }
          }
        });
        drawCanvas(undefined, { wall: nearestWall, positionOnWall: bestT, point: bestPoint })
      }
    }
    
    // Handle grid snap indicators when not drawing
    if (activeTool && !isDrawing) {
      const coords = getCanvasCoordinates(event)
      setMousePosition(coords)
      drawCanvas()
    }
  }, [isDrawing, drawingStart, activeTool, getCanvasCoordinates, snapToGrid, findNearestEndpoint, drawCanvas, elements])

  // Helper: get wall by id (with type guard)
  const getWallById = (id: string): FloorplanElement | undefined => {
    return elements.find((el: FloorplanElement): el is FloorplanElement => el.type === 'wall' && el.id === id && !!el.start && !!el.end);
  }

  // Helper: project a point onto a wall, return { positionOnWall, closestPoint }
  const projectPointToWall = (point: Point, wall: FloorplanElement) => {
    if (!wall.start || !wall.end) return { positionOnWall: 0, closestPoint: { x: 0, y: 0 } }
    const sx = wall.start?.x ?? 0, sy = wall.start?.y ?? 0, ex = wall.end?.x ?? 0, ey = wall.end?.y ?? 0
    const dx = ex - sx, dy = ey - sy
    const lengthSq = dx * dx + dy * dy
    if (lengthSq === 0) return { positionOnWall: 0, closestPoint: { x: sx, y: sy } }
    const t = Math.max(0, Math.min(1, ((point.x - sx) * dx + (point.y - sy) * dy) / lengthSq))
    const closestPoint = { x: sx + t * dx, y: sy + t * dy }
    return { positionOnWall: t, closestPoint }
  }

  // Update handleMouseUp for door/window creation
  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingStart || !activeTool) return
    const coords = getCanvasCoordinates(event)
    if (activeTool === 'wall') {
      // ... existing wall creation logic ...
      const snappedCoords = snapToGrid(coords)
      const nearestEndpoint = findNearestEndpoint(snappedCoords)
      const endPoint = nearestEndpoint || snappedCoords
      const distance = Math.sqrt(
        Math.pow(drawingStart.x - endPoint.x, 2) + Math.pow(drawingStart.y - endPoint.y, 2)
      )
      if (distance < 10) {
        setDrawingState(false)
        return
      }
      const newElement: FloorplanElement = {
        id: generateId(),
        type: 'wall',
        start: drawingStart,
        end: endPoint,
        properties: {
          width: 10,
          height: 200
        }
      }
      addElement(newElement)
      setDrawingState(false)
      return
    }
    // For door/window: single-click placement on nearest wall
    if (activeTool === 'door' || activeTool === 'window') {
      const elementsList: FloorplanElement[] = elements;
      let nearestWall: FloorplanElement | undefined = undefined;
      let minDist = 30;
      let bestT: number | undefined = undefined;
      let bestPoint: Point | undefined = undefined;
      elementsList.forEach((el) => {
        if (el.type === 'wall' && el.start && el.end && typeof el.id === 'string') {
          const { positionOnWall, closestPoint } = projectPointToWall(coords, el);
          const dist = Math.hypot(coords.x - closestPoint.x, coords.y - closestPoint.y);
          if (dist < minDist) {
            minDist = dist;
            nearestWall = el;
            bestT = positionOnWall;
            bestPoint = closestPoint;
          }
        }
      });
      if (!nearestWall || bestT === undefined) {
        setDrawingState(false);
        return; // Only allow placement on a wall
      }
      const wallForDoor: FloorplanElement = nearestWall;
      const newElement: FloorplanElement = {
        id: generateId(),
        type: activeTool,
        parentWallId: wallForDoor.id,
        positionOnWall: bestT,
        width: 80,
        height: 200,
        properties: {
          width: 80,
          height: 200
        }
      }
      addElement(newElement)
      setDrawingState(false)
    }
  }, [isDrawing, drawingStart, activeTool, getCanvasCoordinates, snapToGrid, findNearestEndpoint, addElement, setDrawingState, elements])

  // Find element at point with improved wall thickness consideration and door/window support
  const findElementAtPoint = useCallback((point: Point): FloorplanElement | null => {
    console.log('Searching for element at point:', point)
    
    // Check doors and windows first (they should be on top)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i]
      if ((element.type === 'door' || element.type === 'window') && 
          element.parentWallId && typeof element.positionOnWall === 'number') {
        
        const wall = getWallById(element.parentWallId)
        if (!wall || !wall.start || !wall.end) continue
        
        // Calculate door/window position
        const { start, end } = wall
        const t = element.positionOnWall
        const cx = start.x + (end.x - start.x) * t
        const cy = start.y + (end.y - start.y) * t
        
        // Check if point is near door/window center
        const doorWidth = element.width || element.properties.width || 80
        const threshold = doorWidth / 2 + 8 // Increased padding for easier selection
        const dist = Math.hypot(point.x - cx, point.y - cy)
        
        console.log(`${element.type} ${element.id} at (${cx.toFixed(1)}, ${cy.toFixed(1)}), distance: ${dist.toFixed(1)}, threshold: ${threshold}`)
        
        if (dist <= threshold) {
          console.log('Found', element.type, ':', element.id)
          return element
        }
      }
    }
    
    // Check walls (reverse order for top-most selection)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i]
      if (element.type !== 'wall' || !element.start || !element.end) continue
      
      const thickness = element.properties.width || 10
      const threshold = Math.max(thickness / 2, 8)
      
      if (isPointNearLine(point, element.start, element.end, threshold)) {
        console.log('Found wall:', element.id, 'at distance threshold:', threshold)
        return element
      }
    }
    
    console.log('No element found at point')
    return null
  }, [elements, getWallById, isPointNearLine])

  // Handle click for selection with improved debugging
  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool) {
      console.log('Click ignored - active tool:', activeTool)
      return // Don't select when drawing
    }
    
    const coords = getCanvasCoordinates(event)
    console.log('Click at canvas coordinates:', coords)
    
    const clickedElement = findElementAtPoint(coords)
    console.log('Found element:', clickedElement?.type, clickedElement?.id)
    
    selectElement(clickedElement)
  }, [activeTool, getCanvasCoordinates, selectElement, findElementAtPoint])

  // Draw grid with improved visual clarity (infinite grid)
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 0.5 // Thinner lines for better visual clarity
    // Calculate world coordinates of visible area
    const left = -pan.x / zoom
    const top = -pan.y / zoom
    const right = left + width
    const bottom = top + height
    // Find first grid line positions
    const startX = Math.floor(left / gridSize) * gridSize
    const endX = Math.ceil(right / gridSize) * gridSize
    const startY = Math.floor(top / gridSize) * gridSize
    const endY = Math.ceil(bottom / gridSize) * gridSize
    // Draw vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.lineTo(x, bottom)
      ctx.stroke()
    }
    // Draw horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(left, y)
      ctx.lineTo(right, y)
      ctx.stroke()
    }
    // Draw grid intersection points for better visual reference
    ctx.fillStyle = '#d0d0d0'
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
  }

  // Draw element with thickness and selection indicators
  const drawElement = (ctx: CanvasRenderingContext2D, element: FloorplanElement, isSelected: boolean) => {
    if (element.type === 'wall') {
      if (!element.start || !element.end) return;
      const { start, end, properties } = element
      const thickness = properties.width || 10
      ctx.strokeStyle = isSelected ? '#ff6b6b' : '#333'
      ctx.lineWidth = thickness
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
      
      // Draw selection indicator for walls
      if (isSelected) {
        ctx.strokeStyle = '#ff0000'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
        ctx.setLineDash([])
        
        // Draw endpoint handles
        drawWallEndpointHandles(ctx, start, end)
      }
      return
    }
    // For door/window: compute position from parent wall
    if ((element.type === 'door' || element.type === 'window') && element.parentWallId != null && element.positionOnWall != null) {
      const wall = getWallById(element.parentWallId)
      if (!wall || !wall.start || !wall.end) return
      const { start, end } = wall
      const t = element.positionOnWall
      const cx = start.x + (end.x - start.x) * t
      const cy = start.y + (end.y - start.y) * t
      const angle = Math.atan2(end.y - start.y, end.x - start.x)
      const thickness = wall.properties?.width || 10
      if (element.type === 'door') {
        drawDoor2D(ctx, { x: cx, y: cy }, angle, thickness, isSelected)
      } else {
        drawWindow2D(ctx, { x: cx, y: cy }, angle, thickness, isSelected)
      }
    }
  }

  // Draw wall endpoint handles
  const drawWallEndpointHandles = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    const handleSize = 8
    const handleColor = '#007bff'
    const handleBorderColor = '#ffffff'
    
    // Start endpoint handle
    ctx.fillStyle = handleColor
    ctx.strokeStyle = handleBorderColor
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(start.x, start.y, handleSize, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()
    
    // End endpoint handle
    ctx.beginPath()
    ctx.arc(end.x, end.y, handleSize, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()
    
    // Add labels for clarity
    ctx.fillStyle = '#007bff'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('S', start.x, start.y - handleSize - 5)
    ctx.fillText('E', end.x, end.y - handleSize - 5)
  }

  // Draw door as a rectangle centered on the wall with selection indicator
  const drawDoor2D = (ctx: CanvasRenderingContext2D, center: Point, angle: number, wallThickness: number, isSelected: boolean) => {
    const doorWidth = 40
    const doorThickness = wallThickness * 1.5
    ctx.save()
    ctx.translate(center.x, center.y)
    ctx.rotate(angle)
    ctx.fillStyle = isSelected ? '#ffb74d' : '#8bc34a'
    ctx.fillRect(-doorWidth/2, -doorThickness/2, doorWidth, doorThickness)
    
    // Draw selection border
    if (isSelected) {
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.strokeRect(-doorWidth/2, -doorThickness/2, doorWidth, doorThickness)
      
      // Draw center handle for dragging
      ctx.fillStyle = '#007bff'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, 6, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
    }
    
    ctx.restore()
  }

  // Draw window as a rectangle centered on the wall with selection indicator
  const drawWindow2D = (ctx: CanvasRenderingContext2D, center: Point, angle: number, wallThickness: number, isSelected: boolean) => {
    const windowWidth = 40
    const windowThickness = wallThickness * 1.2
    ctx.save()
    ctx.translate(center.x, center.y)
    ctx.rotate(angle)
    ctx.fillStyle = isSelected ? '#90caf9' : '#2196f3'
    ctx.globalAlpha = 0.7
    ctx.fillRect(-windowWidth/2, -windowThickness/2, windowWidth, windowThickness)
    ctx.globalAlpha = 1.0
    
    // Draw selection border
    if (isSelected) {
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.strokeRect(-windowWidth/2, -windowThickness/2, windowWidth, windowThickness)
      
      // Draw center handle for dragging
      ctx.fillStyle = '#007bff'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, 6, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
    }
    
    ctx.restore()
  }

  // Draw corner indicators with improved visibility
  const drawCornerIndicators = (ctx: CanvasRenderingContext2D) => {
    const corners = new Set<string>()
    elements.forEach(element => {
      if (element.type === 'wall' && element.start && element.end) {
        corners.add(`${Math.round(element.start.x)},${Math.round(element.start.y)}`)
        corners.add(`${Math.round(element.end.x)},${Math.round(element.end.y)}`)
      }
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

  // Draw axes for direction guidance (bottom-right corner)
  const drawAxes = (ctx: CanvasRenderingContext2D) => {
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset transform
    const margin = 40
    const axisLength = 80
    const x0 = canvasSize.width - margin
    const y0 = canvasSize.height - margin
    // X axis
    ctx.strokeStyle = '#e65100'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 - axisLength, y0)
    // Y axis
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0, y0 - axisLength)
    ctx.stroke()
    // Arrow heads
    ctx.beginPath()
    ctx.moveTo(x0 - axisLength, y0)
    ctx.lineTo(x0 - axisLength + 10, y0 - 5)
    ctx.lineTo(x0 - axisLength + 10, y0 + 5)
    ctx.closePath()
    ctx.fillStyle = '#e65100'
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x0, y0 - axisLength)
    ctx.lineTo(x0 - 5, y0 - axisLength + 10)
    ctx.lineTo(x0 + 5, y0 - axisLength + 10)
    ctx.closePath()
    ctx.fill()
    // Labels
    ctx.font = 'bold 16px sans-serif'
    ctx.fillStyle = '#e65100'
    ctx.fillText('X', x0 - axisLength - 18, y0 + 6)
    ctx.fillText('Y', x0 + 6, y0 - axisLength + 8)
    ctx.restore()
  }

  // Disable context menu and double-click zoom
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
  }
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
  }
  // Prevent touch zoom (pinch/double-tap)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const preventTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault()
    }
    canvas.addEventListener('touchstart', preventTouch, { passive: false })
    canvas.addEventListener('touchmove', preventTouch, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', preventTouch)
      canvas.removeEventListener('touchmove', preventTouch)
    }
  }, [])

  // Start dragging selected element or endpoint
  const handleMouseDownDrag = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedElement || activeTool) return
    
    const coords = getCanvasCoordinates(event)
    
    if (selectedElement.type === 'wall' && selectedElement.start && selectedElement.end && selectedElement.id) {
      // Check if clicking on wall endpoints first
      if (isPointNearEndpoint(coords, selectedElement.start, 8)) {
        setIsDraggingEndpoint(true)
        setDraggedEndpoint('start')
        setEndpointDragOffset({ x: coords.x - selectedElement.start.x, y: coords.y - selectedElement.start.y })
        return
      }
      if (isPointNearEndpoint(coords, selectedElement.end, 8)) {
        setIsDraggingEndpoint(true)
        setDraggedEndpoint('end')
        setEndpointDragOffset({ x: coords.x - selectedElement.end.x, y: coords.y - selectedElement.end.y })
        return
      }
      
      // Wall dragging
      const threshold = Math.max(selectedElement.properties.width || 10, 10)
      if (isPointNearLine(coords, selectedElement.start, selectedElement.end, threshold)) {
        setIsDraggingElement(true)
        setDraggedElementId(selectedElement.id)
        setDragOffset({ x: coords.x - selectedElement.start.x, y: coords.y - selectedElement.start.y })
      }
    } else if ((selectedElement.type === 'door' || selectedElement.type === 'window') && 
               selectedElement.parentWallId && typeof selectedElement.positionOnWall === 'number') {
      // Door/window dragging
      const wall = getWallById(selectedElement.parentWallId)
      if (!wall || !wall.start || !wall.end) return
      
      // Calculate door/window center
      const { start, end } = wall
      const t = selectedElement.positionOnWall
      const cx = start.x + (end.x - start.x) * t
      const cy = start.y + (end.y - start.y) * t
      
      // Check if click is near door/window center
      const doorWidth = selectedElement.width || selectedElement.properties.width || 80
      const threshold = doorWidth / 2 + 5
      const dist = Math.hypot(coords.x - cx, coords.y - cy)
      
      if (dist <= threshold) {
        setIsDraggingElement(true)
        setDraggedElementId(selectedElement.id)
        // For doors/windows, we don't need drag offset since we'll project to wall
        setDragOffset(null)
      }
    }
  }, [selectedElement, activeTool, getCanvasCoordinates, isPointNearLine, getWallById, isPointNearEndpoint])

  // Drag selected element or endpoint
  const handleMouseMoveDrag = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedElement || !selectedElement.id) return
    
    const coords = getCanvasCoordinates(event)
    
    if (isDraggingEndpoint && draggedEndpoint && endpointDragOffset && selectedElement.start && selectedElement.end) {
      // Dragging wall endpoint
      let newPoint = { x: coords.x - endpointDragOffset.x, y: coords.y - endpointDragOffset.y }
      newPoint = snapToGrid(newPoint)
      const nearest = findNearestEndpoint(newPoint, 15)
      if (nearest) newPoint = nearest
      
      if (draggedEndpoint === 'start') {
        updateElement(selectedElement.id, { start: newPoint })
      } else {
        updateElement(selectedElement.id, { end: newPoint })
      }
    } else if (isDraggingElement) {
      if (selectedElement.type === 'wall' && selectedElement.start && selectedElement.end && dragOffset) {
        // Wall dragging
        let newStart = { x: coords.x - dragOffset.x, y: coords.y - dragOffset.y }
        newStart = snapToGrid(newStart)
        const nearest = findNearestEndpoint(newStart, 15)
        if (nearest) newStart = nearest
        const dx = newStart.x - selectedElement.start.x
        const dy = newStart.y - selectedElement.start.y
        const newEnd = { x: selectedElement.end.x + dx, y: selectedElement.end.y + dy }
        updateElement(selectedElement.id, { start: newStart, end: newEnd })
      } else if ((selectedElement.type === 'door' || selectedElement.type === 'window') && 
                 selectedElement.parentWallId && typeof selectedElement.positionOnWall === 'number') {
        // Door/window dragging along parent wall
        const wall = getWallById(selectedElement.parentWallId)
        if (!wall || !wall.start || !wall.end) return
        
        // Project mouse position onto wall
        const { positionOnWall } = projectPointToWall(coords, wall)
        
        // Constrain to wall bounds (0-1) with some padding to prevent edge placement
        const constrainedPosition = Math.max(0.05, Math.min(0.95, positionOnWall))
        
        updateElement(selectedElement.id, { positionOnWall: constrainedPosition })
      }
    }
  }, [isDraggingElement, isDraggingEndpoint, draggedEndpoint, endpointDragOffset, selectedElement, dragOffset, getCanvasCoordinates, snapToGrid, findNearestEndpoint, updateElement, getWallById, projectPointToWall])

  // Stop dragging
  const handleMouseUpDrag = useCallback(() => {
    setIsDraggingElement(false)
    setDraggedElementId(null)
    setDragOffset(null)
    setIsDraggingEndpoint(false)
    setDraggedEndpoint(null)
    setEndpointDragOffset(null)
  }, [])

  // Attach native wheel event listener in useEffect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const wheelHandler = (event: WheelEvent) => {
      handleWheel(event as any) // handleWheel expects a React event, but we can adapt
      event.preventDefault()
    }
    canvas.addEventListener('wheel', wheelHandler, { passive: false })
    return () => {
      canvas.removeEventListener('wheel', wheelHandler)
    }
  }, [handleWheel])

  return (
    <canvas
      ref={canvasRef}
      className="floorplan-canvas"
      width={canvasSize.width}
      height={canvasSize.height}
      onMouseDown={e => { handleMouseDownPan(e); handleMouseDownDrag(e); handleMouseDown(e); }}
      onMouseMove={e => { handleMouseMovePan(e); handleMouseMoveDrag(e); handleMouseMoveGlobal(e); }}
      onMouseUp={e => { handleMouseUpPan(); handleMouseUpDrag(); handleMouseUp(e); }}
      onClick={handleClick}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      style={{
        width: '100%',
        height: '100%',
        cursor: isPanning || spacePressed ? 'grab' : (isDraggingElement ? 'grabbing' : (activeTool ? 'crosshair' : 'default')),
        display: 'block'
      }}
    />
  )
}

export default FloorplanCanvas2D 