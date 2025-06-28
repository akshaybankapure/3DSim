# 3D Floorplan Editor

A modern web application for creating and editing 2D floorplans with real-time 3D visualization. Built with React, TypeScript, Three.js, and Vite.

## Features

### 2D Floorplan Editor
- **Drawing Tools**: Create walls, doors, and windows with intuitive drawing tools
- **Grid System**: Snap to grid for precise positioning
- **Element Selection**: Click to select and edit elements
- **Real-time Preview**: See your drawing as you create it

### 3D Visualization
- **Real-time 3D View**: Switch between 2D and 3D views instantly
- **Interactive Camera**: Orbit, pan, and zoom in 3D space
- **Realistic Rendering**: Shadows, lighting, and materials
- **Element Differentiation**: Different colors and materials for walls, doors, and windows

### State Management
- **Zustand Store**: Efficient state management for all floorplan data
- **Persistent Data**: Save and load floorplans as JSON files
- **Undo/Redo Ready**: Architecture supports future undo/redo functionality

### User Interface
- **Modern Design**: Clean, intuitive interface with proper styling
- **Responsive Layout**: Works on different screen sizes
- **Property Panel**: Edit element properties in real-time
- **Tool Selection**: Easy switching between drawing tools

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd 3DSim
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

## Usage

### Creating a Floorplan

1. **Select a Tool**: Choose from Wall, Door, or Window tools in the left toolbar
2. **Draw Elements**: Click and drag on the canvas to create elements
3. **Edit Properties**: Select an element to edit its properties in the right panel
4. **Switch Views**: Use the view toggle to switch between 2D and 3D modes

### Saving and Loading

- **Save**: Click "Save Floorplan" to download your floorplan as a JSON file
- **Load**: Click "Load Floorplan" to upload a previously saved floorplan
- **Clear**: Use "Clear All" to start over

### 3D Navigation

- **Orbit**: Left click and drag to rotate the camera around the scene
- **Pan**: Right click and drag to move the camera
- **Zoom**: Scroll wheel to zoom in and out

## Project Structure

```
src/
├── components/
│   ├── FloorplanCanvas2D.tsx    # 2D drawing canvas
│   ├── FloorplanViewer3D.tsx    # 3D visualization
│   ├── Toolbar.tsx              # Drawing tools
│   ├── PropertiesPanel.tsx      # Element properties editor
│   └── SaveLoadPanel.tsx        # Save/load functionality
├── store/
│   └── floorplanStore.ts        # Zustand state management
├── App.tsx                      # Main application component
├── main.tsx                     # Application entry point
└── index.css                    # Global styles
```

## Technologies Used

- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Three.js**: 3D graphics and visualization
- **Zustand**: Lightweight state management
- **Vite**: Fast build tool and development server
- **Lucide React**: Beautiful icons
- **HTML5 Canvas**: 2D drawing and interaction

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

The project uses TypeScript with strict type checking and ESLint for code quality. All components are functional components using React hooks.

## Future Enhancements

- [ ] Undo/Redo functionality
- [ ] Multiple floors support
- [ ] Furniture and fixtures
- [ ] Room detection and labeling
- [ ] Export to CAD formats
- [ ] Collaborative editing
- [ ] Mobile support
- [ ] Advanced materials and textures

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.