/**
 * Camera Controller for Webcam Access and Motion Detection
 * Handles MediaDevices API, motion detection, and fallback modes
 */

class CameraController {
    constructor(videoElement, motionCanvas) {
        this.video = videoElement;
        this.motionCanvas = motionCanvas;
        this.motionContext = motionCanvas.getContext('2d');
        
        this.stream = null;
        this.isActive = false;
        this.previousFrame = null;
        this.motionThreshold = 30;
        this.sensitivity = 5;
        this.motionData = [];
        this.maxMotionPoints = 10;
        
        // Motion detection settings
        this.detectionSettings = {
            pixelStep: 8, // Skip pixels for performance
            minMotionArea: 100, // Minimum area to consider as motion
            motionDecay: 0.95, // How quickly motion points fade
            maxMotionValue: 255
        };
        
        // Performance monitoring
        this.lastProcessTime = 0;
        this.frameCount = 0;
        this.avgProcessTime = 0;
        
        this.setupCanvas();
    }
    
    /**
     * Set up motion detection canvas
     */
    setupCanvas() {
        // Set canvas size to match video
        this.updateCanvasSize();
        
        // Update canvas size when video metadata loads
        this.video.addEventListener('loadedmetadata', () => {
            this.updateCanvasSize();
        });
    }
    
    /**
     * Update canvas dimensions to match video
     */
    updateCanvasSize() {
        if (this.video.videoWidth && this.video.videoHeight) {
            this.motionCanvas.width = this.video.videoWidth;
            this.motionCanvas.height = this.video.videoHeight;
        }
    }
    
    /**
     * Check if camera access is supported
     */
    isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
    
    /**
     * Request camera access and start video stream
     */
    async initialize() {
        if (!this.isSupported()) {
            throw new Error('Camera access not supported in this browser');
        }
        
        try {
            // Request video stream with preferred settings
            const constraints = {
                video: {
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    frameRate: { ideal: 30, max: 60 },
                    facingMode: 'user' // Front-facing camera
                },
                audio: false
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    this.video.play()
                        .then(() => {
                            this.updateCanvasSize();
                            resolve();
                        })
                        .catch(reject);
                };
                this.video.onerror = reject;
            });
            
            this.isActive = true;
            console.log('Camera initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize camera:', error);
            this.handleCameraError(error);
            throw error;
        }
    }
    
    /**
     * Handle camera access errors with specific error messages
     */
    handleCameraError(error) {
        let errorMessage = 'Camera access failed';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Camera access denied. Please allow camera access and refresh the page.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No camera found. Please connect a camera and refresh the page.';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'Camera is being used by another application.';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = 'Camera does not meet the required specifications.';
        } else if (error.name === 'SecurityError') {
            errorMessage = 'Camera access blocked due to security settings.';
        }
        
        console.error(errorMessage, error);
        return errorMessage;
    }
    
    /**
     * Stop camera stream and clean up
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.video.srcObject) {
            this.video.srcObject = null;
        }
        
        this.isActive = false;
        this.previousFrame = null;
        console.log('Camera stopped');
    }
    
    /**
     * Set motion detection sensitivity (1-10)
     */
    setSensitivity(sensitivity) {
        this.sensitivity = Math.max(1, Math.min(10, sensitivity));
        this.motionThreshold = 50 - (this.sensitivity * 4); // Higher sensitivity = lower threshold
    }
    
    /**
     * Process current video frame for motion detection
     */
    processFrame() {
        if (!this.isActive || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
            return [];
        }
        
        const startTime = performance.now();
        
        try {
            // Draw current frame to canvas
            this.motionContext.drawImage(
                this.video, 
                0, 0, 
                this.motionCanvas.width, 
                this.motionCanvas.height
            );
            
            // Get current frame data
            const currentFrameData = this.motionContext.getImageData(
                0, 0, 
                this.motionCanvas.width, 
                this.motionCanvas.height
            );
            
            let motionPoints = [];
            
            if (this.previousFrame) {
                motionPoints = this.detectMotion(currentFrameData, this.previousFrame);
            }
            
            // Store current frame for next comparison
            this.previousFrame = currentFrameData;
            
            // Update performance metrics
            const processTime = performance.now() - startTime;
            this.frameCount++;
            this.avgProcessTime = (this.avgProcessTime * (this.frameCount - 1) + processTime) / this.frameCount;
            this.lastProcessTime = processTime;
            
            return motionPoints;
            
        } catch (error) {
            console.error('Error processing frame:', error);
            return [];
        }
    }
    
    /**
     * Detect motion between two frames
     */
    detectMotion(currentFrame, previousFrame) {
        const motionPoints = [];
        const { width, height } = currentFrame;
        const currentData = currentFrame.data;
        const previousData = previousFrame.data;
        
        const step = this.detectionSettings.pixelStep;
        const threshold = this.motionThreshold;
        
        // Grid-based motion detection for performance
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const index = (y * width + x) * 4;
                
                // Calculate luminance difference
                const currentLum = this.getLuminance(currentData, index);
                const previousLum = this.getLuminance(previousData, index);
                const diff = Math.abs(currentLum - previousLum);
                
                if (diff > threshold) {
                    // Normalize coordinates to 0-1 range
                    const normalizedX = x / width;
                    const normalizedY = y / height;
                    
                    // Add motion intensity
                    const intensity = Math.min(diff / this.detectionSettings.maxMotionValue, 1);
                    
                    motionPoints.push({
                        x: normalizedX,
                        y: normalizedY,
                        intensity: intensity,
                        timestamp: Date.now()
                    });
                }
            }
        }
        
        // Filter and cluster nearby motion points
        return this.filterMotionPoints(motionPoints);
    }
    
    /**
     * Calculate luminance from RGB values
     */
    getLuminance(data, index) {
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }
    
    /**
     * Filter and cluster motion points to reduce noise
     */
    filterMotionPoints(motionPoints) {
        if (motionPoints.length === 0) return [];
        
        // Sort by intensity (highest first)
        motionPoints.sort((a, b) => b.intensity - a.intensity);
        
        const filtered = [];
        const clusterDistance = 0.1; // Minimum distance between motion points
        
        for (const point of motionPoints) {
            // Check if point is too close to existing points
            const isTooClose = filtered.some(existing => {
                const dx = point.x - existing.x;
                const dy = point.y - existing.y;
                return Math.sqrt(dx * dx + dy * dy) < clusterDistance;
            });
            
            if (!isTooClose) {
                filtered.push(point);
            }
            
            // Limit number of motion points for performance
            if (filtered.length >= this.maxMotionPoints) {
                break;
            }
        }
        
        return filtered;
    }
    
    /**
     * Get accumulated motion data with decay
     */
    getMotionData() {
        const now = Date.now();
        const maxAge = 500; // Motion points expire after 500ms
        
        // Remove old motion points and apply decay
        this.motionData = this.motionData
            .filter(point => now - point.timestamp < maxAge)
            .map(point => ({
                ...point,
                intensity: point.intensity * this.detectionSettings.motionDecay
            }))
            .filter(point => point.intensity > 0.1); // Remove very faded points
        
        return [...this.motionData];
    }
    
    /**
     * Add new motion points to accumulation
     */
    addMotionData(motionPoints) {
        this.motionData.push(...motionPoints);
        
        // Limit total motion points
        if (this.motionData.length > this.maxMotionPoints * 3) {
            this.motionData = this.motionData.slice(-this.maxMotionPoints * 2);
        }
    }
    
    /**
     * Get camera performance statistics
     */
    getStats() {
        return {
            isActive: this.isActive,
            isSupported: this.isSupported(),
            frameCount: this.frameCount,
            avgProcessTime: Math.round(this.avgProcessTime * 100) / 100,
            lastProcessTime: Math.round(this.lastProcessTime * 100) / 100,
            motionThreshold: this.motionThreshold,
            sensitivity: this.sensitivity,
            activeMotionPoints: this.motionData.length,
            videoWidth: this.video.videoWidth,
            videoHeight: this.video.videoHeight
        };
    }
    
    /**
     * Take a snapshot of the current video frame
     */
    takeSnapshot() {
        if (!this.isActive) return null;
        
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        
        const context = canvas.getContext('2d');
        context.drawImage(this.video, 0, 0);
        
        return canvas.toDataURL('image/png');
    }
    
    /**
     * Get current video stream settings
     */
    getStreamSettings() {
        if (!this.stream) return null;
        
        const videoTrack = this.stream.getVideoTracks()[0];
        if (!videoTrack) return null;
        
        return videoTrack.getSettings();
    }
}

// Export for use in other modules
window.CameraController = CameraController;