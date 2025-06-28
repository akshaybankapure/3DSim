import React, { useEffect } from 'react'
import { Square, DoorOpen, Wind, Play, Undo2, Redo2, Box } from 'lucide-react'
import { useFloorplanStore, ElementType } from '../store/floorplanStore'
import { demoFloorplan } from '../demoData'

const Toolbar: React.FC = () => {
  const { 
    activeTool, 
    setActiveTool, 
    elements, 
    addElement, 
    clearFloorplan,
    undo,
    redo,
    canUndo,
    canRedo,
    viewMode,
    setViewMode
  } = useFloorplanStore()

  const tools: { type: ElementType; icon: React.ReactNode; label: string }[] = [
    {
      type: 'wall',
      icon: <Square size={16} />,
      label: 'Wall'
    },
    {
      type: 'door',
      icon: <DoorOpen size={16} />,
      label: 'Door'
    },
    {
      type: 'window',
      icon: <Wind size={16} />,
      label: 'Window'
    }
  ]

  const handleToolClick = (toolType: ElementType) => {
    setActiveTool(activeTool === toolType ? null : toolType)
  }

  const handleLoadDemo = () => {
    if (confirm('Load demo floorplan? This will clear the current floorplan.')) {
      clearFloorplan()
      demoFloorplan.forEach(element => {
        addElement(element)
      })
    }
  }

  const handleToggle3D = () => {
    setViewMode(viewMode === '3D' ? '2D' : '3D')
  }

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return (
    <div className="toolbar">
      <h3>Drawing Tools</h3>
      <div className="tool-group">
        {tools.map((tool) => (
          <button
            key={tool.type}
            className={`tool-button ${activeTool === tool.type ? 'active' : ''}`}
            onClick={() => handleToolClick(tool.type)}
          >
            {tool.icon}
            {tool.label}
          </button>
        ))}
      </div>
      
      <div className="tool-group">
        <button
          className="tool-button"
          onClick={() => setActiveTool(null)}
        >
          Select
        </button>
      </div>

      <div className="tool-group">
        <button
          className="tool-button"
          onClick={undo}
          disabled={!canUndo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
          Undo
        </button>
        <button
          className="tool-button"
          onClick={redo}
          disabled={!canRedo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
          Redo
        </button>
      </div>

      <div className="tool-group">
        <button
          className={`tool-button ${viewMode === '3D' ? 'active' : ''}`}
          onClick={handleToggle3D}
          title={`Switch to ${viewMode === '3D' ? '2D' : '3D'} View`}
          style={{ 
            backgroundColor: viewMode === '3D' ? '#007bff' : '#28a745',
            color: 'white'
          }}
        >
          <Box size={16} />
          {viewMode === '3D' ? '2D View' : '3D View'}
        </button>
      </div>

      <div className="tool-group">
        <button
          className="tool-button"
          onClick={handleLoadDemo}
          style={{ backgroundColor: '#28a745', color: 'white' }}
        >
          <Play size={16} />
          Load Demo
        </button>
      </div>
    </div>
  )
}

export default Toolbar 