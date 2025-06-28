import React, { useRef } from 'react'
import { useFloorplanStore } from '../store/floorplanStore'

const SaveLoadPanel: React.FC = () => {
  const { saveFloorplan, loadFloorplan, clearFloorplan } = useFloorplanStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = () => {
    const data = saveFloorplan()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `floorplan_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleLoad = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      loadFloorplan(content)
    }
    reader.readAsText(file)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the entire floorplan?')) {
      clearFloorplan()
    }
  }

  return (
    <div className="save-load-panel">
      <button onClick={handleSave} className="primary">
        Save Floorplan
      </button>
      <button onClick={handleLoad}>
        Load Floorplan
      </button>
      <button onClick={handleClear}>
        Clear All
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default SaveLoadPanel 