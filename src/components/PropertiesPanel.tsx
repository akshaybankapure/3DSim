import React from 'react'
import { useFloorplanStore } from '../store/floorplanStore'

const PropertiesPanel: React.FC = () => {
  const { selectedElement, updateElement, deleteElement, elements } = useFloorplanStore()

  if (!selectedElement) {
    return (
      <div className="properties-panel">
        <h3>Properties</h3>
        <p>Select an element to edit its properties</p>
      </div>
    )
  }

  const handlePropertyChange = (property: string, value: string | number) => {
    updateElement(selectedElement.id, {
      properties: {
        ...selectedElement.properties,
        [property]: value
      }
    })
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this element?')) {
      deleteElement(selectedElement.id)
    }
  }

  // Helper function to get parent wall for doors/windows
  const getParentWall = () => {
    if (selectedElement.parentWallId) {
      return elements.find(el => el.id === selectedElement.parentWallId && el.type === 'wall')
    }
    return null
  }

  const parentWall = getParentWall()

  return (
    <div className="properties-panel">
      <h3>Properties - {selectedElement.type}</h3>
      
      <div className="property-group">
        <label>Width:</label>
        <input
          type="number"
          value={selectedElement.width || selectedElement.properties.width || ''}
          onChange={(e) => {
            const value = Number(e.target.value)
            updateElement(selectedElement.id, {
              width: value,
              properties: { ...selectedElement.properties, width: value }
            })
          }}
          min="1"
          max="1000"
        />
      </div>
      
      <div className="property-group">
        <label>Height:</label>
        <input
          type="number"
          value={selectedElement.height || selectedElement.properties.height || ''}
          onChange={(e) => {
            const value = Number(e.target.value)
            updateElement(selectedElement.id, {
              height: value,
              properties: { ...selectedElement.properties, height: value }
            })
          }}
          min="1"
          max="1000"
        />
      </div>
      
      {/* Wall-specific properties */}
      {selectedElement.type === 'wall' && selectedElement.start && selectedElement.end && (
        <>
          <div className="property-group">
            <label>Start X:</label>
            <input
              type="number"
              value={Math.round(selectedElement.start.x)}
              onChange={(e) => {
                if (selectedElement.start) {
                  updateElement(selectedElement.id, {
                    start: { x: Number(e.target.value), y: selectedElement.start.y }
                  })
                }
              }}
            />
          </div>
          
          <div className="property-group">
            <label>Start Y:</label>
            <input
              type="number"
              value={Math.round(selectedElement.start.y)}
              onChange={(e) => {
                if (selectedElement.start) {
                  updateElement(selectedElement.id, {
                    start: { x: selectedElement.start.x, y: Number(e.target.value) }
                  })
                }
              }}
            />
          </div>
          
          <div className="property-group">
            <label>End X:</label>
            <input
              type="number"
              value={Math.round(selectedElement.end.x)}
              onChange={(e) => {
                if (selectedElement.end) {
                  updateElement(selectedElement.id, {
                    end: { x: Number(e.target.value), y: selectedElement.end.y }
                  })
                }
              }}
            />
          </div>
          
          <div className="property-group">
            <label>End Y:</label>
            <input
              type="number"
              value={Math.round(selectedElement.end.y)}
              onChange={(e) => {
                if (selectedElement.end) {
                  updateElement(selectedElement.id, {
                    end: { x: selectedElement.end.x, y: Number(e.target.value) }
                  })
                }
              }}
            />
          </div>
        </>
      )}
      
      {/* Door/Window-specific properties */}
      {(selectedElement.type === 'door' || selectedElement.type === 'window') && (
        <>
          <div className="property-group">
            <label>Position on Wall:</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={selectedElement.positionOnWall || 0}
              onChange={(e) => updateElement(selectedElement.id, {
                positionOnWall: Number(e.target.value)
              })}
            />
            <small>0 = start of wall, 1 = end of wall</small>
          </div>
          
          {parentWall && (
            <div className="property-group">
              <label>Parent Wall:</label>
              <span style={{ padding: '4px 8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                {parentWall.id} ({Math.round(parentWall.start?.x || 0)}, {Math.round(parentWall.start?.y || 0)}) to ({Math.round(parentWall.end?.x || 0)}, {Math.round(parentWall.end?.y || 0)})
              </span>
            </div>
          )}
          
          <div className="property-group">
            <label>Wall Thickness:</label>
            <input
              type="number"
              value={parentWall?.properties?.width || 10}
              onChange={(e) => {
                if (parentWall) {
                  updateElement(parentWall.id, {
                    properties: { ...parentWall.properties, width: Number(e.target.value) }
                  })
                }
              }}
              min="1"
              max="50"
            />
          </div>
        </>
      )}
      
      <button
        onClick={handleDelete}
        style={{
          marginTop: '16px',
          padding: '8px 16px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Delete Element
      </button>
    </div>
  )
}

export default PropertiesPanel 