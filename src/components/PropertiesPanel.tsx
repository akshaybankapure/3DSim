import React from 'react'
import { useFloorplanStore } from '../store/floorplanStore'

const PropertiesPanel: React.FC = () => {
  const { selectedElement, updateElement, deleteElement } = useFloorplanStore()

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

  return (
    <div className="properties-panel">
      <h3>Properties - {selectedElement.type}</h3>
      
      <div className="property-group">
        <label>Width:</label>
        <input
          type="number"
          value={selectedElement.properties.width || ''}
          onChange={(e) => handlePropertyChange('width', Number(e.target.value))}
          min="1"
          max="1000"
        />
      </div>
      
      <div className="property-group">
        <label>Height:</label>
        <input
          type="number"
          value={selectedElement.properties.height || ''}
          onChange={(e) => handlePropertyChange('height', Number(e.target.value))}
          min="1"
          max="1000"
        />
      </div>
      
      <div className="property-group">
        <label>Start X:</label>
        <input
          type="number"
          value={Math.round(selectedElement.start.x)}
          onChange={(e) => updateElement(selectedElement.id, {
            start: { ...selectedElement.start, x: Number(e.target.value) }
          })}
        />
      </div>
      
      <div className="property-group">
        <label>Start Y:</label>
        <input
          type="number"
          value={Math.round(selectedElement.start.y)}
          onChange={(e) => updateElement(selectedElement.id, {
            start: { ...selectedElement.start, y: Number(e.target.value) }
          })}
        />
      </div>
      
      <div className="property-group">
        <label>End X:</label>
        <input
          type="number"
          value={Math.round(selectedElement.end.x)}
          onChange={(e) => updateElement(selectedElement.id, {
            end: { ...selectedElement.end, x: Number(e.target.value) }
          })}
        />
      </div>
      
      <div className="property-group">
        <label>End Y:</label>
        <input
          type="number"
          value={Math.round(selectedElement.end.y)}
          onChange={(e) => updateElement(selectedElement.id, {
            end: { ...selectedElement.end, y: Number(e.target.value) }
          })}
        />
      </div>
      
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