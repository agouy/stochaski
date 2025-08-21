// shapes.js - Shape generation and collision detection

class Shape {
    constructor(canvas, type = 'circle') {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.type = type;
        
        // Position and size
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = 20 + Math.random() * 40;
        this.originalSize = this.size;
        
        // Movement
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        
        // Visual properties
        this.hue = Math.random() * 360;
        this.saturation = 70 + Math.random() * 30;
        this.lightness = 50 + Math.random() * 30;
        this.alpha = 0.8;
        
        // Animation properties
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.02 + Math.random() * 0.03;
        this.pulseAmplitude = 0.2;
        
        // Collision state
        this.isHit = false;
        this.hitTime = 0;
        this.hitDuration = 500; // ms
        
        // Audio properties
        this.noteIndex = Math.floor(Math.random() * 12); // 0-11 for chromatic scale
        this.lastTriggerTime = 0;
        this.minTriggerInterval = 200; // ms
        
        // Stochastic properties
        this.chaosLevel = Math.random();
        this.nextDirectionChange = Date.now() + Math.random() * 3000;
    }

    update(deltaTime) {
        const now = Date.now();
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Bounce off edges
        if (this.x < this.size || this.x > this.canvas.width - this.size) {
            this.vx *= -1;
            this.x = Math.max(this.size, Math.min(this.canvas.width - this.size, this.x));
        }
        if (this.y < this.size || this.y > this.canvas.height - this.size) {
            this.vy *= -1;
            this.y = Math.max(this.size, Math.min(this.canvas.height - this.size, this.y));
        }
        
        // Update rotation
        this.rotation += this.rotationSpeed;
        
        // Update pulse animation
        this.pulsePhase += this.pulseSpeed;
        const pulseFactor = 1 + Math.sin(this.pulsePhase) * this.pulseAmplitude;
        this.size = this.originalSize * pulseFactor;
        
        // Stochastic direction changes
        if (now > this.nextDirectionChange) {
            this.vx += (Math.random() - 0.5) * this.chaosLevel;
            this.vy += (Math.random() - 0.5) * this.chaosLevel;
            
            // Limit velocity
            const maxVel = 3;
            this.vx = Math.max(-maxVel, Math.min(maxVel, this.vx));
            this.vy = Math.max(-maxVel, Math.min(maxVel, this.vy));
            
            this.nextDirectionChange = now + 1000 + Math.random() * 3000;
        }
        
        // Update hit state
        if (this.isHit && now - this.hitTime > this.hitDuration) {
            this.isHit = false;
        }
        
        // Slowly change color
        this.hue += 0.1;
        if (this.hue > 360) this.hue -= 360;
    }

    draw() {
        this.ctx.save();
        
        // Move to shape center
        this.ctx.translate(this.x, this.y);
        this.ctx.rotate(this.rotation);
        
        // Apply hit effect
        let effectScale = 1;
        let effectAlpha = this.alpha;
        
        if (this.isHit) {
            const progress = (Date.now() - this.hitTime) / this.hitDuration;
            effectScale = 1 + (1 - progress) * 0.5; // Scale up when hit
            effectAlpha = this.alpha + (1 - progress) * 0.3; // Brighten when hit
        }
        
        this.ctx.scale(effectScale, effectScale);
        
        // Set color
        const color = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${effectAlpha})`;
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness + 20}%, ${effectAlpha})`;
        this.ctx.lineWidth = 2;
        
        // Draw shape based on type
        switch (this.type) {
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                break;
                
            case 'triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(0, -this.size / 2);
                this.ctx.lineTo(-this.size / 2, this.size / 2);
                this.ctx.lineTo(this.size / 2, this.size / 2);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
                
            case 'square':
                this.ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                this.ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
                break;
                
            case 'diamond':
                this.ctx.beginPath();
                this.ctx.moveTo(0, -this.size / 2);
                this.ctx.lineTo(this.size / 2, 0);
                this.ctx.lineTo(0, this.size / 2);
                this.ctx.lineTo(-this.size / 2, 0);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
        }
        
        this.ctx.restore();
    }

    checkCollision(motionArea) {
        // Convert motion area to canvas coordinates
        const areaX = motionArea.centerX * this.canvas.width;
        const areaY = motionArea.centerY * this.canvas.height;
        const areaRadius = Math.sqrt(motionArea.area) / 2;
        
        // Calculate distance from shape center to motion center
        const dx = this.x - areaX;
        const dy = this.y - areaY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if collision occurs
        const collisionDistance = this.size / 2 + areaRadius;
        return distance < collisionDistance;
    }

    triggerHit() {
        const now = Date.now();
        if (now - this.lastTriggerTime > this.minTriggerInterval) {
            this.isHit = true;
            this.hitTime = now;
            this.lastTriggerTime = now;
            return true;
        }
        return false;
    }
}

class ShapeManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.shapes = [];
        this.isRunning = false;
        this.lastFrameTime = 0;
        
        // Configuration
        this.maxShapes = 12;
        this.minShapes = 6;
        this.shapeTypes = ['circle', 'triangle', 'square', 'diamond'];
        
        // Callbacks
        this.onShapeHit = null;
        
        // Particle system for visual effects
        this.particles = [];
    }

    initialize(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size to match video
        const video = document.getElementById('webcam');
        if (video.videoWidth > 0) {
            this.resizeCanvas(video.videoWidth, video.videoHeight);
        }
        
        // Listen for video size changes
        video.addEventListener('loadedmetadata', () => {
            this.resizeCanvas(video.videoWidth, video.videoHeight);
        });
        
        this.generateInitialShapes();
        return true;
    }

    resizeCanvas(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Update existing shapes' canvas reference
        this.shapes.forEach(shape => {
            shape.canvas = this.canvas;
            shape.ctx = this.ctx;
        });
    }

    generateInitialShapes() {
        this.shapes = [];
        const numShapes = this.minShapes + Math.floor(Math.random() * (this.maxShapes - this.minShapes));
        
        for (let i = 0; i < numShapes; i++) {
            const shapeType = this.shapeTypes[Math.floor(Math.random() * this.shapeTypes.length)];
            this.shapes.push(new Shape(this.canvas, shapeType));
        }
    }

    start() {
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.animate();
    }

    stop() {
        this.isRunning = false;
    }

    animate() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and draw shapes
        this.shapes.forEach(shape => {
            shape.update(deltaTime);
            shape.draw();
        });
        
        // Update and draw particles
        this.updateParticles(deltaTime);
        
        // Occasionally add or remove shapes for variety
        if (Math.random() < 0.001) { // Very low probability
            this.adjustShapeCount();
        }
        
        requestAnimationFrame(() => this.animate());
    }

    checkCollisions(motionAreas) {
        const hits = [];
        
        motionAreas.forEach(motionArea => {
            this.shapes.forEach((shape, index) => {
                if (shape.checkCollision(motionArea)) {
                    if (shape.triggerHit()) {
                        hits.push({
                            shape: shape,
                            shapeIndex: index,
                            motionArea: motionArea
                        });
                        
                        // Create particles at collision point
                        this.createHitParticles(
                            motionArea.centerX * this.canvas.width,
                            motionArea.centerY * this.canvas.height,
                            shape.hue
                        );
                    }
                }
            });
        });
        
        // Notify about hits
        if (this.onShapeHit && hits.length > 0) {
            this.onShapeHit(hits);
        }
        
        return hits;
    }

    createHitParticles(x, y, hue) {
        const particleCount = 8 + Math.random() * 12;
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                size: 2 + Math.random() * 4,
                hue: hue + (Math.random() - 0.5) * 60,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02
            });
        }
    }

    updateParticles(deltaTime) {
        this.particles = this.particles.filter(particle => {
            // Update particle
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.98; // Friction
            particle.vy *= 0.98;
            particle.life -= particle.decay;
            
            // Draw particle
            if (particle.life > 0) {
                this.ctx.save();
                this.ctx.globalAlpha = particle.life;
                this.ctx.fillStyle = `hsl(${particle.hue}, 80%, 60%)`;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
                return true;
            }
            
            return false;
        });
    }

    adjustShapeCount() {
        if (this.shapes.length < this.maxShapes && Math.random() < 0.7) {
            // Add a shape
            const shapeType = this.shapeTypes[Math.floor(Math.random() * this.shapeTypes.length)];
            this.shapes.push(new Shape(this.canvas, shapeType));
        } else if (this.shapes.length > this.minShapes && Math.random() < 0.3) {
            // Remove a shape
            this.shapes.splice(Math.floor(Math.random() * this.shapes.length), 1);
        }
    }

    getShapes() {
        return this.shapes;
    }

    setShapeCount(count) {
        const targetCount = Math.max(this.minShapes, Math.min(this.maxShapes, count));
        
        while (this.shapes.length < targetCount) {
            const shapeType = this.shapeTypes[Math.floor(Math.random() * this.shapeTypes.length)];
            this.shapes.push(new Shape(this.canvas, shapeType));
        }
        
        while (this.shapes.length > targetCount) {
            this.shapes.pop();
        }
    }

    setShapeSpeed(speedMultiplier) {
        this.shapes.forEach(shape => {
            shape.vx *= speedMultiplier;
            shape.vy *= speedMultiplier;
        });
    }
}

// Export for use in other modules
window.Shape = Shape;
window.ShapeManager = ShapeManager;