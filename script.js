// script.js - Main application logic

class StochasticMusicApp {
    constructor() {
        this.cameraManager = null;
        this.shapeManager = null;
        this.audioManager = null;
        
        this.isRunning = false;
        this.isInitialized = false;
        
        // UI elements
        this.elements = {};
        
        // Settings
        this.settings = {
            motionSensitivity: 50,
            currentScale: 'major',
            ambientVolume: 0.3,
            enableAmbient: true
        };
        
        // Ambient music timer
        this.ambientTimer = null;
        
        // Performance monitoring
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 0;
    }

    async initialize() {
        try {
            // Get UI elements
            this.setupUIElements();
            
            // Initialize managers
            this.cameraManager = new CameraManager();
            this.shapeManager = new ShapeManager();
            this.audioManager = new AudioManager();
            
            // Set up callbacks
            this.setupCallbacks();
            
            // Initialize managers
            await this.cameraManager.initialize();
            this.shapeManager.initialize('interactionCanvas');
            await this.audioManager.initialize();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            this.updateStatus('audio', 'ready');
            
            // Hide loading overlay
            this.hideOverlay('loadingOverlay');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize the application. Please refresh and try again.');
            return false;
        }
    }

    setupUIElements() {
        this.elements = {
            // Buttons
            startBtn: document.getElementById('startBtn'),
            pauseBtn: document.getElementById('pauseBtn'),
            requestPermissionBtn: document.getElementById('requestPermission'),
            retryBtn: document.getElementById('retryBtn'),
            
            // Controls
            scaleSelector: document.getElementById('scaleSelector'),
            sensitivitySlider: document.getElementById('sensitivitySlider'),
            sensitivityValue: document.getElementById('sensitivityValue'),
            
            // Status
            cameraStatus: document.getElementById('cameraStatus'),
            motionStatus: document.getElementById('motionStatus'),
            audioStatus: document.getElementById('audioStatus'),
            
            // Overlays
            loadingOverlay: document.getElementById('loadingOverlay'),
            permissionOverlay: document.getElementById('permissionOverlay'),
            errorOverlay: document.getElementById('errorOverlay'),
            errorMessage: document.getElementById('errorMessage')
        };
    }

    setupCallbacks() {
        // Camera callbacks
        this.cameraManager.onCameraStatus = (status, message) => {
            this.handleCameraStatus(status, message);
        };
        
        this.cameraManager.onMotionDetected = (motionAreas) => {
            this.handleMotionDetected(motionAreas);
        };
        
        // Shape callbacks
        this.shapeManager.onShapeHit = (hits) => {
            this.handleShapeHits(hits);
        };
    }

    setupEventListeners() {
        // Start/Stop buttons
        this.elements.startBtn.addEventListener('click', () => {
            this.start();
        });
        
        this.elements.pauseBtn.addEventListener('click', () => {
            this.pause();
        });
        
        // Permission button
        this.elements.requestPermissionBtn.addEventListener('click', () => {
            this.requestCameraPermission();
        });
        
        // Retry button
        this.elements.retryBtn.addEventListener('click', () => {
            this.hideOverlay('errorOverlay');
            this.initialize();
        });
        
        // Scale selector
        this.elements.scaleSelector.addEventListener('change', (e) => {
            this.setScale(e.target.value);
        });
        
        // Sensitivity slider
        this.elements.sensitivitySlider.addEventListener('input', (e) => {
            this.setSensitivity(parseInt(e.target.value));
        });
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning) {
                this.pause();
            }
        });
        
        // Handle resize
        window.addEventListener('resize', () => {
            // Debounce resize
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }

    async requestCameraPermission() {
        try {
            this.hideOverlay('permissionOverlay');
            this.showOverlay('loadingOverlay');
            
            const success = await this.cameraManager.requestPermissions();
            
            if (success) {
                this.hideOverlay('loadingOverlay');
            } else {
                this.showError('Camera access was denied. Please check your browser settings and try again.');
            }
        } catch (error) {
            this.showError('Failed to access camera: ' + error.message);
        }
    }

    async start() {
        if (!this.isInitialized) {
            this.showError('Application not initialized');
            return;
        }
        
        if (!this.cameraManager.stream) {
            this.showOverlay('permissionOverlay');
            return;
        }
        
        try {
            // Resume audio context (required by browser policies)
            await this.audioManager.resume();
            
            // Start managers
            this.cameraManager.start();
            this.shapeManager.start();
            
            // Start ambient music
            if (this.settings.enableAmbient) {
                this.startAmbientMusic();
            }
            
            this.isRunning = true;
            
            // Update UI
            this.elements.startBtn.disabled = true;
            this.elements.pauseBtn.disabled = false;
            
            this.updateStatus('motion', 'active');
            
            console.log('Stochastic music experience started!');
        } catch (error) {
            console.error('Failed to start experience:', error);
            this.showError('Failed to start the experience: ' + error.message);
        }
    }

    pause() {
        if (!this.isRunning) return;
        
        this.cameraManager.stop();
        this.shapeManager.stop();
        this.stopAmbientMusic();
        
        this.isRunning = false;
        
        // Update UI
        this.elements.startBtn.disabled = false;
        this.elements.pauseBtn.disabled = true;
        
        this.updateStatus('motion', 'inactive');
        
        console.log('Experience paused');
    }

    setScale(scaleName) {
        this.settings.currentScale = scaleName;
        this.audioManager.setScale(scaleName);
        console.log('Scale changed to:', scaleName);
    }

    setSensitivity(value) {
        this.settings.motionSensitivity = value;
        this.cameraManager.setSensitivity(value);
        this.elements.sensitivityValue.textContent = value;
    }

    handleCameraStatus(status, message) {
        switch (status) {
            case 'connected':
                this.updateStatus('camera', 'connected');
                break;
            case 'active':
                this.updateStatus('camera', 'active');
                break;
            case 'stopped':
                this.updateStatus('camera', 'connected');
                break;
            case 'disconnected':
                this.updateStatus('camera', 'disconnected');
                break;
            case 'failed':
                this.updateStatus('camera', 'disconnected');
                this.showError('Camera error: ' + message);
                break;
        }
    }

    handleMotionDetected(motionAreas) {
        if (!this.isRunning) return;
        
        // Update motion status
        if (motionAreas.length > 0) {
            this.updateStatus('motion', 'active');
        }
        
        // Check for collisions with shapes
        const hits = this.shapeManager.checkCollisions(motionAreas);
        
        // Performance monitoring
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFrameTime > 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = now;
        }
    }

    handleShapeHits(hits) {
        hits.forEach(hit => {
            const shape = hit.shape;
            const intensity = Math.min(1.0, hit.motionArea.area / 1000); // Scale based on motion area
            
            // Play note based on shape's note index
            this.audioManager.playNote(shape.noteIndex, intensity, 0.5 + Math.random() * 0.5);
            
            // Occasionally trigger percussion
            if (Math.random() < 0.3) {
                const percType = Math.random() < 0.7 ? 'kick' : 'hihat';
                this.audioManager.playPercussion(percType);
            }
            
            console.log(`Shape hit! Note: ${shape.noteIndex}, Intensity: ${intensity.toFixed(2)}`);
        });
    }

    startAmbientMusic() {
        if (this.ambientTimer) return;
        
        const playAmbient = () => {
            if (this.isRunning && this.settings.enableAmbient) {
                this.audioManager.playAmbientLayer();
                
                // Schedule next ambient note (stochastic timing)
                const nextDelay = 3000 + Math.random() * 7000; // 3-10 seconds
                this.ambientTimer = setTimeout(playAmbient, nextDelay);
            }
        };
        
        // Start after a short delay
        this.ambientTimer = setTimeout(playAmbient, 2000);
    }

    stopAmbientMusic() {
        if (this.ambientTimer) {
            clearTimeout(this.ambientTimer);
            this.ambientTimer = null;
        }
    }

    updateStatus(type, status) {
        const statusElement = this.elements[type + 'Status'];
        if (!statusElement) return;
        
        const indicator = statusElement.querySelector('.status-indicator');
        const text = statusElement.querySelector('span:last-child');
        
        // Remove existing status classes
        indicator.classList.remove('connected', 'active', 'ready');
        
        switch (status) {
            case 'connected':
                indicator.classList.add('connected');
                if (type === 'camera') text.textContent = 'Camera: Connected';
                break;
            case 'active':
                indicator.classList.add('active');
                if (type === 'camera') text.textContent = 'Camera: Active';
                if (type === 'motion') text.textContent = 'Motion: Detected';
                break;
            case 'ready':
                indicator.classList.add('ready');
                if (type === 'audio') text.textContent = 'Audio: Ready';
                break;
            case 'disconnected':
                if (type === 'camera') text.textContent = 'Camera: Disconnected';
                break;
            case 'inactive':
                if (type === 'motion') text.textContent = 'Motion: None';
                break;
        }
    }

    showOverlay(overlayId) {
        const overlay = this.elements[overlayId];
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideOverlay(overlayId) {
        const overlay = this.elements[overlayId];
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.hideOverlay('loadingOverlay');
        this.hideOverlay('permissionOverlay');
        this.showOverlay('errorOverlay');
    }

    handleResize() {
        // Recalculate canvas sizes if needed
        if (this.shapeManager && this.cameraManager) {
            const video = document.getElementById('webcam');
            if (video.videoWidth > 0) {
                this.shapeManager.resizeCanvas(video.videoWidth, video.videoHeight);
            }
        }
    }

    // Cleanup when page unloads
    dispose() {
        this.pause();
        
        if (this.cameraManager) {
            this.cameraManager.release();
        }
        
        if (this.audioManager) {
            this.audioManager.dispose();
        }
        
        this.stopAmbientMusic();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    window.app = new StochasticMusicApp();
    
    // Check for required features
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.getElementById('errorMessage').textContent = 
            'Your browser does not support camera access. Please use a modern browser.';
        document.getElementById('errorOverlay').classList.remove('hidden');
        document.getElementById('loadingOverlay').classList.add('hidden');
        return;
    }
    
    if (!window.AudioContext && !window.webkitAudioContext) {
        document.getElementById('errorMessage').textContent = 
            'Your browser does not support Web Audio API. Please use a modern browser.';
        document.getElementById('errorOverlay').classList.remove('hidden');
        document.getElementById('loadingOverlay').classList.add('hidden');
        return;
    }
    
    // Initialize the app
    const success = await window.app.initialize();
    
    if (!success) {
        console.error('Failed to initialize Stochastic Music App');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.dispose();
    }
});

// Debug functions for development
window.debugApp = {
    getStats: () => {
        if (!window.app) return 'App not initialized';
        
        return {
            isRunning: window.app.isRunning,
            isInitialized: window.app.isInitialized,
            currentScale: window.app.settings.currentScale,
            motionSensitivity: window.app.settings.motionSensitivity,
            fps: window.app.fps,
            activeShapes: window.app.shapeManager ? window.app.shapeManager.shapes.length : 0,
            activeVoices: window.app.audioManager ? window.app.audioManager.activeVoices.size : 0
        };
    },
    
    setScale: (scale) => {
        if (window.app) window.app.setScale(scale);
    },
    
    setSensitivity: (value) => {
        if (window.app) window.app.setSensitivity(value);
    },
    
    playTestNote: (noteIndex = 0) => {
        if (window.app && window.app.audioManager) {
            window.app.audioManager.playNote(noteIndex, 0.8, 1.0);
        }
    }
};