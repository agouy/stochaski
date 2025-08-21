/**
 * Main Application Script for Stochastic Music Generation Web App
 * Coordinates camera, audio, shapes, and user interaction
 */

class StochasticMusicApp {
    constructor() {
        // DOM elements
        this.video = document.getElementById('video');
        this.motionCanvas = document.getElementById('motion-canvas');
        this.graphicsCanvas = document.getElementById('graphics-canvas');
        this.statusMessage = document.getElementById('status-message');
        this.modeText = document.getElementById('mode-text');
        this.fallbackMessage = document.getElementById('fallback-message');
        
        // Controls
        this.scaleSelect = document.getElementById('scale-select');
        this.volumeSlider = document.getElementById('volume-slider');
        this.volumeValue = document.getElementById('volume-value');
        this.sensitivitySlider = document.getElementById('sensitivity-slider');
        this.sensitivityValue = document.getElementById('sensitivity-value');
        this.toggleAudioBtn = document.getElementById('toggle-audio');
        this.resetShapesBtn = document.getElementById('reset-shapes');
        
        // Stats
        this.shapeCountEl = document.getElementById('shape-count');
        this.noteCountEl = document.getElementById('note-count');
        this.motionLevelEl = document.getElementById('motion-level');
        
        // Controllers
        this.audioController = new AudioController();
        this.cameraController = new CameraController(this.video, this.motionCanvas);
        this.shapesController = new ShapesController(this.graphicsCanvas, this.audioController);
        
        // App state
        this.isInitialized = false;
        this.currentMode = 'camera'; // 'camera' or 'fallback'
        this.isAudioEnabled = false;
        this.updateInterval = null;
        this.statsInterval = null;
        
        // Performance monitoring
        this.frameCount = 0;
        this.lastStatsUpdate = Date.now();
        
        // Initialize app
        this.initialize();
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        this.updateStatus('Initializing application...', 'info');
        
        try {
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize particle background
            this.initializeParticles();
            
            // Try to initialize camera first
            await this.initializeCamera();
            
            // Start the app
            this.start();
            
            this.isInitialized = true;
            this.updateStatus('Application ready! Click "Start Audio" to begin.', 'success');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.updateStatus('Initialization failed. Using fallback mode.', 'error');
            this.switchToFallbackMode();
        }
    }
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Audio controls
        this.toggleAudioBtn.addEventListener('click', () => {
            this.toggleAudio();
        });
        
        // Scale selection
        this.scaleSelect.addEventListener('change', (e) => {
            this.audioController.setScale(e.target.value);
            this.updateStatus(`Scale changed to ${e.target.value}`, 'info');
        });
        
        // Volume control
        this.volumeSlider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value) / 100;
            this.audioController.setVolume(volume);
            this.volumeValue.textContent = `${e.target.value}%`;
        });
        
        // Sensitivity control
        this.sensitivitySlider.addEventListener('input', (e) => {
            const sensitivity = parseInt(e.target.value);
            this.cameraController.setSensitivity(sensitivity);
            this.sensitivityValue.textContent = sensitivity;
        });
        
        // Reset shapes
        this.resetShapesBtn.addEventListener('click', () => {
            this.shapesController.clearShapes();
            this.updateStatus('Shapes cleared', 'info');
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
        
        // Window events
        window.addEventListener('focus', () => {
            if (this.isAudioEnabled && this.audioController.audioContext) {
                this.audioController.audioContext.resume();
            }
        });
        
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(event) {
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.toggleAudio();
                break;
            case 'KeyR':
                event.preventDefault();
                this.shapesController.clearShapes();
                break;
            case 'KeyT':
                event.preventDefault();
                this.audioController.testSound();
                break;
        }
    }
    
    /**
     * Initialize camera
     */
    async initializeCamera() {
        if (!this.cameraController.isSupported()) {
            throw new Error('Camera not supported');
        }
        
        try {
            this.updateStatus('Requesting camera access...', 'info');
            await this.cameraController.initialize();
            this.currentMode = 'camera';
            this.modeText.textContent = 'Camera Mode';
            this.updateStatus('Camera initialized successfully', 'success');
            
        } catch (error) {
            console.error('Camera initialization failed:', error);
            const errorMessage = this.cameraController.handleCameraError(error);
            this.updateStatus(errorMessage, 'error');
            throw error;
        }
    }
    
    /**
     * Switch to fallback mode (mouse/touch interaction)
     */
    switchToFallbackMode() {
        this.currentMode = 'fallback';
        this.modeText.textContent = 'Fallback Mode';
        this.fallbackMessage.classList.remove('hidden');
        this.video.style.display = 'none';
        
        // Enable mouse/touch interaction on graphics canvas
        this.enableFallbackInteraction();
        
        this.updateStatus('Using mouse/touch interaction mode', 'warning');
    }
    
    /**
     * Enable fallback interaction mode
     */
    enableFallbackInteraction() {
        let lastInteraction = 0;
        const minInterval = 100; // Minimum time between interactions
        
        const handleInteraction = (event) => {
            const now = Date.now();
            if (now - lastInteraction < minInterval) return;
            
            const rect = this.graphicsCanvas.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            
            // Create motion point for fallback mode
            const motionPoint = {
                x: x,
                y: y,
                intensity: 0.8,
                timestamp: now
            };
            
            this.shapesController.createShapesFromMotion([motionPoint]);
            lastInteraction = now;
        };
        
        // Mouse events
        this.graphicsCanvas.addEventListener('mousemove', handleInteraction);
        this.graphicsCanvas.addEventListener('click', handleInteraction);
        
        // Touch events
        this.graphicsCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                handleInteraction(e.touches[0]);
            }
        });
        
        this.graphicsCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                handleInteraction(e.touches[0]);
            }
        });
    }
    
    /**
     * Toggle audio on/off
     */
    async toggleAudio() {
        if (!this.isAudioEnabled) {
            try {
                this.updateStatus('Initializing audio...', 'info');
                const success = await this.audioController.enable();
                
                if (success) {
                    this.isAudioEnabled = true;
                    this.toggleAudioBtn.textContent = 'Stop Audio';
                    this.toggleAudioBtn.classList.remove('primary');
                    this.toggleAudioBtn.classList.add('secondary');
                    this.updateStatus('Audio enabled', 'success');
                    
                    // Play test sound
                    setTimeout(() => {
                        this.audioController.testSound();
                    }, 100);
                    
                } else {
                    throw new Error('Failed to enable audio');
                }
                
            } catch (error) {
                console.error('Audio initialization failed:', error);
                this.updateStatus('Audio initialization failed', 'error');
            }
            
        } else {
            this.audioController.disable();
            this.isAudioEnabled = false;
            this.toggleAudioBtn.textContent = 'Start Audio';
            this.toggleAudioBtn.classList.remove('secondary');
            this.toggleAudioBtn.classList.add('primary');
            this.updateStatus('Audio disabled', 'info');
        }
    }
    
    /**
     * Start the main application loop
     */
    start() {
        // Start shapes animation
        this.shapesController.start();
        
        // Start update loop
        this.updateInterval = setInterval(() => {
            this.update();
        }, 1000 / 30); // 30 FPS
        
        // Start stats update
        this.statsInterval = setInterval(() => {
            this.updateStats();
        }, 1000);
        
        console.log('Application started');
    }
    
    /**
     * Main update loop
     */
    update() {
        if (this.currentMode === 'camera' && this.cameraController.isActive) {
            // Process camera frame for motion detection
            const motionPoints = this.cameraController.processFrame();
            
            if (motionPoints.length > 0) {
                // Add motion data to camera controller
                this.cameraController.addMotionData(motionPoints);
                
                // Create shapes from motion
                this.shapesController.createShapesFromMotion(motionPoints);
            }
        }
        
        this.frameCount++;
    }
    
    /**
     * Update application statistics
     */
    updateStats() {
        const now = Date.now();
        const deltaTime = now - this.lastStatsUpdate;
        const fps = Math.round((this.frameCount * 1000) / deltaTime);
        
        // Update shape count
        const shapeStats = this.shapesController.getStats();
        this.shapeCountEl.textContent = shapeStats.shapeCount;
        
        // Update note count
        const audioStats = this.audioController.getStats();
        this.noteCountEl.textContent = audioStats.noteCount;
        
        // Update motion level
        if (this.currentMode === 'camera') {
            const motionData = this.cameraController.getMotionData();
            const avgIntensity = motionData.length > 0 
                ? motionData.reduce((sum, point) => sum + point.intensity, 0) / motionData.length 
                : 0;
            this.motionLevelEl.textContent = `${Math.round(avgIntensity * 100)}%`;
        } else {
            this.motionLevelEl.textContent = 'N/A';
        }
        
        // Reset frame counter
        this.frameCount = 0;
        this.lastStatsUpdate = now;
        
        // Log performance info occasionally
        if (Math.random() < 0.1) {
            console.log(`FPS: ${fps}, Shapes: ${shapeStats.shapeCount}, Notes: ${audioStats.noteCount}`);
        }
    }
    
    /**
     * Update status message
     */
    updateStatus(message, type = 'info') {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Auto-clear success messages after a delay
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (this.statusMessage.textContent === message) {
                    this.statusMessage.textContent = 'Ready';
                    this.statusMessage.className = 'status-message';
                }
            }, 3000);
        }
    }
    
    /**
     * Initialize particle background animation
     */
    initializeParticles() {
        const particlesContainer = document.getElementById('particles');
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 6 + 's';
            particle.style.animationDuration = (4 + Math.random() * 4) + 's';
            particlesContainer.appendChild(particle);
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Stop intervals
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        
        // Stop controllers
        this.shapesController.stop();
        this.cameraController.stop();
        this.audioController.disable();
        
        console.log('Application cleaned up');
    }
    
    /**
     * Get application status for debugging
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            currentMode: this.currentMode,
            isAudioEnabled: this.isAudioEnabled,
            camera: this.cameraController.getStats(),
            audio: this.audioController.getStats(),
            shapes: this.shapesController.getStats()
        };
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Stochastic Music App...');
    window.stochasticApp = new StochasticMusicApp();
});

// Global error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.stochasticApp) {
        window.stochasticApp.updateStatus('An error occurred. Check console for details.', 'error');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.stochasticApp) {
        window.stochasticApp.updateStatus('Promise rejection. Check console for details.', 'error');
    }
});

// Export for debugging
window.StochasticMusicApp = StochasticMusicApp;