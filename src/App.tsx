import React from 'react'
import { useFloorplanStore } from './store/floorplanStore'
import Toolbar from './components/Toolbar'
import FloorplanCanvas2D from './components/FloorplanCanvas2D'
import FloorplanViewer3D from './components/FloorplanViewer3D'
import PropertiesPanel from './components/PropertiesPanel'
import SaveLoadPanel from './components/SaveLoadPanel'
import { Eye, Box } from 'lucide-react'

function App() {
  const { viewMode, setViewMode } = useFloorplanStore()

  return (
    <div className="canvas-container">
      <Toolbar />
      
      <div className="view-toggle">
        <button
          className={`view-button ${viewMode === '2D' ? 'active' : ''}`}
          onClick={() => setViewMode('2D')}
          title="2D Floorplan View"
        >
          <Eye size={16} />
          2D View
        </button>
        <button
          className={`view-button ${viewMode === '3D' ? 'active' : ''}`}
          onClick={() => setViewMode('3D')}
          title="3D Visualization"
        >
          <Box size={16} />
          3D View
        </button>
      </div>
      
      {viewMode === '2D' ? (
        <FloorplanCanvas2D />
      ) : (
        <FloorplanViewer3D />
      )}
      
      <PropertiesPanel />
      <SaveLoadPanel />
    </div>
  )
}

export default App 