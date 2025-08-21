// camera.js - Webcam handling and motion detection

class CameraManager {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.stream = null;
        this.isActive = false;
        this.motionThreshold = 50;
        this.previousFrame = null;
        this.motionAreas = [];
        this.frameWidth = 0;
        this.frameHeight = 0;
        
        // Motion detection settings
        this.motionSensitivity = 30;
        this.minMotionArea = 100;
        this.maxMotionAreas = 10;
        
        // Callbacks
        this.onMotionDetected = null;
        this.onCameraStatus = null;
    }

    async initialize() {
        try {
            this.video = document.getElementById('webcam');
            this.canvas = document.getElementById('motionCanvas');
            this.ctx = this.canvas.getContext('2d');

            // Set up video event listeners
            this.video.addEventListener('loadedmetadata', () => {
                this.frameWidth = this.video.videoWidth;
                this.frameHeight = this.video.videoHeight;
                this.canvas.width = this.frameWidth;
                this.canvas.height = this.frameHeight;
                
                // Start motion detection loop
                if (this.isActive) {
                    this.startMotionDetection();
                }
            });

            return true;
        } catch (error) {
            console.error('Failed to initialize camera manager:', error);
            return false;
        }
    }

    async requestPermissions() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            // Update camera status
            if (this.onCameraStatus) {
                this.onCameraStatus('connected');
            }

            return true;
        } catch (error) {
            console.error('Camera permission denied or failed:', error);
            if (this.onCameraStatus) {
                this.onCameraStatus('failed', error.message);
            }
            return false;
        }
    }

    start() {
        if (!this.stream) {
            throw new Error('Camera not initialized. Call requestPermissions() first.');
        }
        
        this.isActive = true;
        if (this.frameWidth > 0 && this.frameHeight > 0) {
            this.startMotionDetection();
        }
        
        if (this.onCameraStatus) {
            this.onCameraStatus('active');
        }
    }

    stop() {
        this.isActive = false;
        if (this.onCameraStatus) {
            this.onCameraStatus('stopped');
        }
    }

    release() {
        this.stop();
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.onCameraStatus) {
            this.onCameraStatus('disconnected');
        }
    }

    setSensitivity(value) {
        // Value from 10-100, convert to motion threshold
        this.motionSensitivity = 101 - value; // Invert so higher slider = more sensitive
        this.motionThreshold = this.motionSensitivity * 2;
    }

    startMotionDetection() {
        const detectMotion = () => {
            if (!this.isActive) return;

            try {
                // Draw current video frame to canvas
                this.ctx.drawImage(this.video, 0, 0, this.frameWidth, this.frameHeight);
                const currentFrame = this.ctx.getImageData(0, 0, this.frameWidth, this.frameHeight);

                if (this.previousFrame) {
                    const motionData = this.calculateMotion(currentFrame, this.previousFrame);
                    this.motionAreas = this.findMotionAreas(motionData);
                    
                    // Draw motion visualization
                    this.drawMotionVisualization();
                    
                    // Notify about motion
                    if (this.onMotionDetected && this.motionAreas.length > 0) {
                        this.onMotionDetected(this.motionAreas);
                    }
                }

                this.previousFrame = currentFrame;
                
                // Continue detection loop
                requestAnimationFrame(detectMotion);
            } catch (error) {
                console.error('Motion detection error:', error);
                // Continue anyway
                requestAnimationFrame(detectMotion);
            }
        };

        detectMotion();
    }

    calculateMotion(currentFrame, previousFrame) {
        const current = currentFrame.data;
        const previous = previousFrame.data;
        const motionData = new Uint8ClampedArray(currentFrame.width * currentFrame.height);

        for (let i = 0; i < current.length; i += 4) {
            // Calculate brightness difference
            const currentBrightness = (current[i] + current[i + 1] + current[i + 2]) / 3;
            const previousBrightness = (previous[i] + previous[i + 1] + previous[i + 2]) / 3;
            const diff = Math.abs(currentBrightness - previousBrightness);

            // Store motion intensity
            const pixelIndex = Math.floor(i / 4);
            motionData[pixelIndex] = diff > this.motionThreshold ? 255 : 0;
        }

        return motionData;
    }

    findMotionAreas(motionData) {
        const areas = [];
        const visited = new Set();
        const width = this.frameWidth;
        const height = this.frameHeight;

        // Find connected components of motion
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                
                if (motionData[index] > 0 && !visited.has(index)) {
                    const area = this.floodFill(motionData, x, y, width, height, visited);
                    
                    if (area.size > this.minMotionArea && areas.length < this.maxMotionAreas) {
                        // Calculate bounding box
                        let minX = width, maxX = 0, minY = height, maxY = 0;
                        
                        for (const pixelIndex of area) {
                            const px = pixelIndex % width;
                            const py = Math.floor(pixelIndex / width);
                            minX = Math.min(minX, px);
                            maxX = Math.max(maxX, px);
                            minY = Math.min(minY, py);
                            maxY = Math.max(maxY, py);
                        }

                        areas.push({
                            x: minX,
                            y: minY,
                            width: maxX - minX,
                            height: maxY - minY,
                            centerX: (minX + maxX) / 2,
                            centerY: (minY + maxY) / 2,
                            area: area.size
                        });
                    }
                }
            }
        }

        return areas;
    }

    floodFill(motionData, startX, startY, width, height, visited) {
        const stack = [{x: startX, y: startY}];
        const area = new Set();

        while (stack.length > 0) {
            const {x, y} = stack.pop();
            const index = y * width + x;

            if (x < 0 || x >= width || y < 0 || y >= height || 
                visited.has(index) || motionData[index] === 0) {
                continue;
            }

            visited.add(index);
            area.add(index);

            // Add neighbors
            stack.push(
                {x: x + 1, y: y},
                {x: x - 1, y: y},
                {x: x, y: y + 1},
                {x: x, y: y - 1}
            );
        }

        return area;
    }

    drawMotionVisualization() {
        // Clear previous visualization
        this.ctx.clearRect(0, 0, this.frameWidth, this.frameHeight);

        // Draw motion areas
        this.ctx.strokeStyle = '#ff6b6b';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = 'rgba(255, 107, 107, 0.2)';

        this.motionAreas.forEach(area => {
            // Draw bounding box
            this.ctx.fillRect(area.x, area.y, area.width, area.height);
            this.ctx.strokeRect(area.x, area.y, area.width, area.height);

            // Draw center point
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.beginPath();
            this.ctx.arc(area.centerX, area.centerY, 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = 'rgba(255, 107, 107, 0.2)';
        });
    }

    getMotionAreas() {
        return this.motionAreas;
    }

    // Convert canvas coordinates to relative coordinates (0-1)
    getRelativeMotionAreas() {
        return this.motionAreas.map(area => ({
            x: area.x / this.frameWidth,
            y: area.y / this.frameHeight,
            width: area.width / this.frameWidth,
            height: area.height / this.frameHeight,
            centerX: area.centerX / this.frameWidth,
            centerY: area.centerY / this.frameHeight,
            area: area.area
        }));
    }
}

// Export for use in other modules
window.CameraManager = CameraManager;