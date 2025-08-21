# Stochaski

A stochastic music experience that generates music through webcam-based interaction with moving shapes and objects.

## Web Application

The main application is a creative web app that uses computer vision and generative music principles to create an interactive musical experience.

### Features

- **Webcam Integration**: Real-time motion detection using MediaDevices API
- **Interactive Shapes**: Animated geometric objects that respond to user movement
- **Stochastic Music**: Dynamic sound generation using Web Audio API
- **Music Scales**: Support for Major, Minor, Pentatonic, Blues, and Chromatic scales
- **Visual Effects**: Particle systems and collision feedback
- **Responsive Design**: Works on desktop and mobile devices

### Usage

1. Open `index.html` in a modern web browser
2. Grant camera permissions when prompted
3. Select your preferred music scale
4. Adjust motion sensitivity as needed
5. Click "Start Experience" to begin
6. Move in front of your camera to interact with shapes and create music

### Technical Implementation

- **Pure Web Technologies**: HTML5, CSS3, and JavaScript (no external frameworks)
- **HTML5 Canvas**: For rendering graphics and motion detection
- **Web Audio API**: For real-time sound synthesis
- **MediaDevices API**: For webcam access and video processing

### File Structure

- `index.html` - Main HTML structure and UI
- `style.css` - Responsive styling and visual design
- `script.js` - Main application logic and coordination
- `camera.js` - Webcam handling and motion detection
- `shapes.js` - Shape generation and collision detection
- `audio.js` - Web Audio API sound generation

## Python Scripts

The `code/` directory contains the original Python-based video processing and MIDI generation scripts for reference.

## Development

To run the web application locally:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

### Browser Requirements

- Chrome 66+ or Firefox 60+ (for modern Web Audio API support)
- Camera access permissions
- HTTPS for production deployment (required for camera access)
