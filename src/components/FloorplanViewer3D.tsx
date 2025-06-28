import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useFloorplanStore, FloorplanElement } from '../store/floorplanStore'

const FloorplanViewer3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { elements } = useFloorplanStore()
  
  useEffect(() => {
    if (!containerRef.current) return
    
    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      10000
    )
    camera.position.set(0, 100, 100)
    camera.lookAt(0, 0, 0)
    
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
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(50, 100, 50)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)
    
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(500, 500)
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
    
    // Grid helper
    const gridHelper = new THREE.GridHelper(500, 50, 0x888888, 0xcccccc)
    gridHelper.position.y = 0.1 // Offset grid above floor to prevent z-fighting
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
      const material = new THREE.MeshLambertMaterial({ color: 0x8d6e63 })
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
    
    // Function to create door geometry
    const createDoorGeometry = (element: FloorplanElement) => {
      const { start, end } = element
      const length = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      )
      const height = element.properties.height || 200
      const width = element.properties.width || 80
      
      const geometry = new THREE.BoxGeometry(length, height, width)
      const material = new THREE.MeshLambertMaterial({ color: 0x8bc34a })
      const door = new THREE.Mesh(geometry, material)
      
      // Position and rotate door
      const midX = (start.x + end.x) / 2
      const midZ = (start.y + end.y) / 2
      door.position.set(midX, height / 2, midZ)
      
      const angle = Math.atan2(end.y - start.y, end.x - start.x)
      door.rotation.y = angle
      
      door.castShadow = true
      door.receiveShadow = true
      
      return door
    }
    
    // Function to create window geometry
    const createWindowGeometry = (element: FloorplanElement) => {
      const { start, end } = element
      const length = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      )
      const height = element.properties.height || 200
      const width = element.properties.width || 80
      
      const geometry = new THREE.BoxGeometry(length, height, width)
      const material = new THREE.MeshLambertMaterial({ 
        color: 0x2196f3,
        transparent: true,
        opacity: 0.7
      })
      const window = new THREE.Mesh(geometry, material)
      
      // Position and rotate window
      const midX = (start.x + end.x) / 2
      const midZ = (start.y + end.y) / 2
      window.position.set(midX, height / 2, midZ)
      
      const angle = Math.atan2(end.y - start.y, end.x - start.x)
      window.rotation.y = angle
      
      window.castShadow = true
      window.receiveShadow = true
      
      return window
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