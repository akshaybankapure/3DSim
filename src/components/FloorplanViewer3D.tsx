import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useFloorplanStore, FloorplanElement } from '../store/floorplanStore'

const GRID_SIZE = 20 // Match 2D grid size
const GRID_PADDING = 100 // Padding around the floorplan

const FloorplanViewer3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { elements } = useFloorplanStore()
  
  // Helper: Get bounding box of all elements
  const getFloorplanBounds = (elements: FloorplanElement[]) => {
    if (elements.length === 0) {
      return { minX: -250, maxX: 250, minY: -250, maxY: 250 }
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    elements.forEach(el => {
      minX = Math.min(minX, el.start.x, el.end.x)
      maxX = Math.max(maxX, el.start.x, el.end.x)
      minY = Math.min(minY, el.start.y, el.end.y)
      maxY = Math.max(maxY, el.start.y, el.end.y)
    })
    return { minX, maxX, minY, maxY }
  }
  
  useEffect(() => {
    if (!containerRef.current) return
    
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
    
    // Function to create wall geometry
    const createWallGeometry = (element: FloorplanElement) => {
      const { start, end } = element
      const length = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      )
      const height = element.properties.height || 200
      const width = element.properties.width || 10
      
      const geometry = new THREE.BoxGeometry(length, height, width)
      const material = new THREE.MeshLambertMaterial({ color: 0xbca18c })
      const wall = new THREE.Mesh(geometry, material)
      
      // Position and rotate wall
      const midX = (start.x + end.x) / 2
      const midZ = (start.y + end.y) / 2
      wall.position.set(midX, height / 2, midZ)
      
      const angle = Math.atan2(end.y - start.y, end.x - start.x)
      wall.rotation.y = angle
      
      wall.castShadow = true
      wall.receiveShadow = true
      
      return wall
    }
    
    // Function to create door geometry (centered and aligned)
    const createDoorGeometry = (element: FloorplanElement) => {
      const { start, end } = element
      const doorWidth = element.properties.width || 80
      const doorHeight = element.properties.height || 200
      const wallThickness = 10
      
      const geometry = new THREE.BoxGeometry(doorWidth, doorHeight * 0.9, wallThickness * 1.2)
      const material = new THREE.MeshLambertMaterial({ color: 0x8bc34a })
      const door = new THREE.Mesh(geometry, material)
      
      // Center door on wall
      const midX = (start.x + end.x) / 2
      const midZ = (start.y + end.y) / 2
      door.position.set(midX, doorHeight * 0.45, midZ)
      
      const angle = Math.atan2(end.y - start.y, end.x - start.x)
      door.rotation.y = angle
      
      door.castShadow = true
      door.receiveShadow = true
      
      return door
    }
    
    // Function to create window geometry (centered and aligned)
    const createWindowGeometry = (element: FloorplanElement) => {
      const { start, end } = element
      const windowWidth = element.properties.width || 80
      const windowHeight = element.properties.height || 80
      const wallThickness = 10
      
      const geometry = new THREE.BoxGeometry(windowWidth, windowHeight, wallThickness * 1.1)
      const material = new THREE.MeshLambertMaterial({ 
        color: 0x2196f3,
        transparent: true,
        opacity: 0.7
      })
      const windowMesh = new THREE.Mesh(geometry, material)
      
      // Center window on wall, at 2/3 wall height
      const midX = (start.x + end.x) / 2
      const midZ = (start.y + end.y) / 2
      windowMesh.position.set(midX, windowHeight * 0.5 + 60, midZ)
      
      const angle = Math.atan2(end.y - start.y, end.x - start.x)
      windowMesh.rotation.y = angle
      
      windowMesh.castShadow = true
      windowMesh.receiveShadow = true
      
      return windowMesh
    }
    
    // Function to update 3D scene
    const updateScene = () => {
      // Remove existing elements
      scene.children = scene.children.filter((child: THREE.Object3D) => 
        child === floor || child === gridHelper || 
        child === ambientLight || child === directionalLight
      )
      
      // Add new elements
      elements.forEach(element => {
        let mesh: THREE.Mesh
        
        switch (element.type) {
          case 'wall':
            mesh = createWallGeometry(element)
            break
          case 'door':
            mesh = createDoorGeometry(element)
            break
          case 'window':
            mesh = createWindowGeometry(element)
            break
          default:
            return
        }
        
        scene.add(mesh)
      })
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