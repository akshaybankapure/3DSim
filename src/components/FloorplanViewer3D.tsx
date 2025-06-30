import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useFloorplanStore, FloorplanElement } from '../store/floorplanStore'
import { WallGraph } from '../utils/wall-graph'
import { WallMeshBuilder } from '../utils/wall-mesh-builder'
import { computeSharedCorner } from '../utils/wall-geometry-utils'

const GRID_SIZE = 20 // Match 2D grid size
const GRID_PADDING = 100 // Padding around the floorplan

const FloorplanViewer3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { elements } = useFloorplanStore()
  
  // Helper: Get bounding box of all elements (walls and doors/windows)
  const getFloorplanBounds = (elements: FloorplanElement[]) => {
    if (elements.length === 0) {
      return { minX: -250, maxX: 250, minY: -250, maxY: 250 }
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    elements.forEach(el => {
      if (el.type === 'wall' && el.start && el.end) {
        minX = Math.min(minX, el.start.x, el.end.x)
        maxX = Math.max(maxX, el.start.x, el.end.x)
        minY = Math.min(minY, el.start.y, el.end.y)
        maxY = Math.max(maxY, el.start.y, el.end.y)
      } else if ((el.type === 'door' || el.type === 'window') && el.parentWallId && typeof el.positionOnWall === 'number') {
        // Find parent wall
        const wall = elements.find(w => w.id === el.parentWallId && w.type === 'wall' && w.start && w.end)
        if (wall && wall.start && wall.end) {
          const sx = wall.start.x, sy = wall.start.y, ex = wall.end.x, ey = wall.end.y
          const t = el.positionOnWall
          const px = sx + (ex - sx) * t
          const py = sy + (ey - sy) * t
          minX = Math.min(minX, px)
          maxX = Math.max(maxX, px)
          minY = Math.min(minY, py)
          maxY = Math.max(maxY, py)
        }
      }
    })
    return { minX, maxX, minY, maxY }
  }
  
  useEffect(() => {
    if (!containerRef.current) return
    
    console.log(`=== 3D Viewer useEffect triggered ===`);
    console.log(`Elements array length: ${elements.length}`);
    console.log(`Elements IDs:`, elements.map(el => el.id));
    
    // Check for duplicate elements
    const elementIds = elements.map(el => el.id);
    const uniqueIds = new Set(elementIds);
    if (elementIds.length !== uniqueIds.size) {
      console.warn(`WARNING: Duplicate elements detected! ${elementIds.length} total, ${uniqueIds.size} unique`);
      const duplicates = elementIds.filter((id, index) => elementIds.indexOf(id) !== index);
      console.warn(`Duplicate IDs:`, duplicates);
    }
    
    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    
    // Compute bounds and center
    const bounds = getFloorplanBounds(elements)
    const width = bounds.maxX - bounds.minX + GRID_PADDING * 2
    const height = bounds.maxY - bounds.minY + GRID_PADDING * 2
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      10000
    )
    // Place camera above and offset, looking at center
    camera.position.set(centerX, Math.max(width, height), centerY + Math.max(width, height) / 2)
    camera.lookAt(centerX, 0, centerY)
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.set(centerX, 0, centerY)
    controls.update()
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(centerX + 50, 100, centerY + 50)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)
    
    // Floor (match bounds)
    const floorGeometry = new THREE.PlaneGeometry(width, height)
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(centerX, 0, centerY)
    floor.receiveShadow = true
    scene.add(floor)
    
    // Grid helper (match bounds and grid size)
    const gridDivisions = Math.ceil(Math.max(width, height) / GRID_SIZE)
    const gridHelper = new THREE.GridHelper(Math.max(width, height), gridDivisions, 0x888888, 0xcccccc)
    gridHelper.position.set(centerX, 0.1, centerY) // Offset grid above floor to prevent z-fighting
    scene.add(gridHelper)
    
    // Function to create door geometry (centered and aligned)
    const createDoorGeometry = (element: FloorplanElement) => {
      if (!element.parentWallId || typeof element.positionOnWall !== 'number') return null
      // Find parent wall
      const wall = elements.find(w => w.id === element.parentWallId && w.type === 'wall' && w.start && w.end)
      if (!wall || !wall.start || !wall.end) return null
      const sx = wall.start.x, sy = wall.start.y, ex = wall.end.x, ey = wall.end.y
      const t = element.positionOnWall
      const cx = sx + (ex - sx) * t
      const cy = sy + (ey - sy) * t
      const doorWidth = element.width || element.properties.width || 80
      const doorHeight = element.height || element.properties.height || 200
      const wallThickness = wall.properties.width || 10
      const geometry = new THREE.BoxGeometry(doorWidth, doorHeight * 0.9, wallThickness * 1.2)
      const material = new THREE.MeshLambertMaterial({ color: 0x8bc34a })
      const door = new THREE.Mesh(geometry, material)
      door.position.set(cx, doorHeight * 0.45, cy)
      const angle = Math.atan2(ey - sy, ex - sx)
      door.rotation.y = angle
      door.castShadow = true
      door.receiveShadow = true
      return door
    }
    
    // Function to create window geometry (centered and aligned)
    const createWindowGeometry = (element: FloorplanElement) => {
      if (!element.parentWallId || typeof element.positionOnWall !== 'number') return null
      // Find parent wall
      const wall = elements.find(w => w.id === element.parentWallId && w.type === 'wall' && w.start && w.end)
      if (!wall || !wall.start || !wall.end) return null
      const sx = wall.start.x, sy = wall.start.y, ex = wall.end.x, ey = wall.end.y
      const t = element.positionOnWall
      const cx = sx + (ex - sx) * t
      const cy = sy + (ey - sy) * t
      const windowWidth = element.width || element.properties.width || 80
      const windowHeight = element.height || element.properties.height || 80
      const wallThickness = wall.properties.width || 10
      const geometry = new THREE.BoxGeometry(windowWidth, windowHeight, wallThickness * 1.1)
      const material = new THREE.MeshLambertMaterial({ color: 0x2196f3, transparent: true, opacity: 0.7 })
      const windowMesh = new THREE.Mesh(geometry, material)
      windowMesh.position.set(cx, windowHeight * 0.5 + 60, cy)
      const angle = Math.atan2(ey - sy, ex - sx)
      windowMesh.rotation.y = angle
      windowMesh.castShadow = true
      windowMesh.receiveShadow = true
      return windowMesh
    }
    
    // Function to update 3D scene
    const updateScene = () => {
      console.log(`Scene update: ${scene.children.length} objects before cleanup`);
      
      // Remove existing elements
      const objectsToKeep = scene.children.filter((child: THREE.Object3D) => 
        child === floor || child === gridHelper || 
        child === ambientLight || child === directionalLight
      )
      
      console.log(`Keeping ${objectsToKeep.length} objects (floor, grid, lights), removing ${scene.children.length - objectsToKeep.length} objects`);
      
      scene.children = objectsToKeep;
      
      console.log(`Scene after cleanup: ${scene.children.length} objects`);
      
      // --- Professional Wall Engine with Shared-Corner Mitering ---
      // Build wall graph and compute shared corners (recalculate each time)
      console.log(`Processing ${elements.length} total elements`)
      const wallElements = elements.filter(el => el.type === 'wall')
      console.log(`Found ${wallElements.length} wall elements:`, wallElements.map(w => ({ id: w.id, start: w.start, end: w.end })))
      
      const wallGraph = new WallGraph(elements)
      const sharedCorners = new Map<string, { x: number; y: number }>()
      
      // Compute shared corner points for each node
      for (const [nodeKey, node] of wallGraph.nodes.entries()) {
        const sharedCorner = computeSharedCorner(node, node.edges)
        sharedCorners.set(nodeKey, sharedCorner)
        
        // Debug: Log corner computation
        console.log(`Node ${nodeKey}: Original (${node.x.toFixed(1)}, ${node.y.toFixed(1)}) -> Shared (${sharedCorner.x.toFixed(1)}, ${sharedCorner.y.toFixed(1)})`)
      }
      
      // Create wall mesh builder
      const wallMeshBuilder = new WallMeshBuilder(wallGraph)
      
      // Debug: Log wall graph info
      console.log(`Wall Graph: ${wallGraph.nodes.size} nodes, ${wallGraph.edges.size} edges`)
      console.log(`Wall Edges:`, Array.from(wallGraph.edges.values()).map(e => ({ id: e.id, start: `${e.start.x},${e.start.y}`, end: `${e.end.x},${e.end.y}` })))
      console.log(`Shared Corners: ${sharedCorners.size} computed corner points`)
      
      // Add walls using professional wall engine
      const wallMeshes = wallMeshBuilder.buildAllMeshes(sharedCorners)
      console.log(`Created ${wallMeshes.length} wall mesh(es)`)
      wallMeshes.forEach((mesh, index) => {
        console.log(`Adding wall mesh ${index}:`, mesh)
        scene.add(mesh)
      })
      
      // Add doors and windows
      elements.forEach(element => {
        let mesh: THREE.Mesh | null = null
        
        switch (element.type) {
          case 'door':
            mesh = createDoorGeometry(element)
            break
          case 'window':
            mesh = createWindowGeometry(element)
            break
          default:
            return
        }
        
        if (mesh) scene.add(mesh)
      })
      
      console.log(`Scene after adding elements: ${scene.children.length} objects`);
    }
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return
      
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    
    window.addEventListener('resize', handleResize)
    
    // Initial scene update
    updateScene()
    animate()
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [elements])
  
  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative'
      }} 
    />
  )
}

export default FloorplanViewer3D 