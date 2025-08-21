/**
 * Shapes Controller for Animated Musical Shapes
 * Handles shape creation, animation, physics, and collision detection
 */

class ShapesController {
    constructor(canvas, audioController) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.audioController = audioController;
        
        this.shapes = [];
        this.maxShapes = 12;
        this.animationId = null;
        this.isRunning = false;
        
        // Shape types and their properties
        this.shapeTypes = ['circle', 'square', 'triangle', 'star', 'hexagon'];
        this.colorPalette = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
            '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
        ];
        
        // Physics settings
        this.physics = {
            gravity: 0.1,
            bounce: 0.8,
            friction: 0.99,
            maxVelocity: 8
        };
        
        // Visual effects
        this.particles = [];
        this.trails = [];
        
        this.setupCanvas();
        this.bindEvents();
    }
    
    /**
     * Set up canvas and resize handling
     */
    setupCanvas() {
        this.resizeCanvas();
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }
    
    /**
     * Resize canvas to match container
     */
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }
    
    /**
     * Bind mouse and touch events
     */
    bindEvents() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            this.handleInteraction(e, 'mouse');
        });
        
        this.canvas.addEventListener('click', (e) => {
            this.handleInteraction(e, 'click');
        });
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleInteraction(e.touches[0], 'touch');
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleInteraction(e.touches[0], 'touch');
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
        });
    }
    
    /**
     * Handle user interaction (mouse/touch)
     */
    handleInteraction(event, type) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        
        if (type === 'click' || type === 'touch') {
            this.createShape(x, y, 'user');
        }
        
        // Create interaction effect
        this.createParticles(x * this.canvas.width, y * this.canvas.height, 3);
    }
    
    /**
     * Create a new musical shape
     */
    createShape(x, y, source = 'motion') {
        if (this.shapes.length >= this.maxShapes) {
            // Remove oldest shape
            this.shapes.shift();
        }
        
        const shape = {
            id: `shape_${Date.now()}_${Math.random()}`,
            type: this.getRandomShapeType(),
            x: x * this.canvas.width,
            y: y * this.canvas.height,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: 20 + Math.random() * 30,
            color: this.getRandomColor(),
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            pulse: 0,
            pulseSpeed: 0.02 + Math.random() * 0.08,
            opacity: 0.8 + Math.random() * 0.2,
            life: 1.0,
            decay: 0.003 + Math.random() * 0.002,
            glowIntensity: Math.random() * 0.5 + 0.5,
            musicNote: null,
            lastCollision: 0,
            source: source,
            harmonic: Math.random() > 0.7 // Some shapes are harmonic
        };
        
        this.shapes.push(shape);
        
        // Play initial note
        this.playShapeNote(shape);
        
        return shape;
    }
    
    /**
     * Get random shape type with weighted distribution
     */
    getRandomShapeType() {
        const weights = [0.3, 0.25, 0.2, 0.15, 0.1]; // Circle is most common
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < this.shapeTypes.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) {
                return this.shapeTypes[i];
            }
        }
        
        return this.shapeTypes[0];
    }
    
    /**
     * Get random color from palette
     */
    getRandomColor() {
        return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    }
    
    /**
     * Play musical note for a shape
     */
    playShapeNote(shape) {
        if (!this.audioController.isEnabled) return;
        
        const x = shape.x / this.canvas.width;
        const y = shape.y / this.canvas.height;
        
        // Duration based on shape size and type
        const baseDuration = 0.5;
        const sizeFactor = shape.size / 50;
        const duration = baseDuration * sizeFactor;
        
        shape.musicNote = this.audioController.playNote(x, y, duration, shape.id);
    }
    
    /**
     * Create shapes from motion data
     */
    createShapesFromMotion(motionPoints) {
        for (const point of motionPoints) {
            // Only create shapes for significant motion
            if (point.intensity > 0.3) {
                // Add some randomness to prevent clustering
                const jitterX = point.x + (Math.random() - 0.5) * 0.1;
                const jitterY = point.y + (Math.random() - 0.5) * 0.1;
                
                this.createShape(
                    Math.max(0, Math.min(1, jitterX)),
                    Math.max(0, Math.min(1, jitterY)),
                    'motion'
                );
            }
        }
    }
    
    /**
     * Start animation loop
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.animate();
    }
    
    /**
     * Stop animation loop
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * Main animation loop
     */
    animate() {
        if (!this.isRunning) return;
        
        this.update();
        this.render();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    /**
     * Update all shapes and physics
     */
    update() {
        // Update shapes
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            this.updateShape(shape);
            
            // Remove dead shapes
            if (shape.life <= 0) {
                this.shapes.splice(i, 1);
            }
        }
        
        // Check collisions
        this.checkCollisions();
        
        // Update particles
        this.updateParticles();
        
        // Update trails
        this.updateTrails();
    }
    
    /**
     * Update individual shape
     */
    updateShape(shape) {
        // Apply physics
        shape.vy += this.physics.gravity;
        shape.vx *= this.physics.friction;
        shape.vy *= this.physics.friction;
        
        // Limit velocity
        const speed = Math.sqrt(shape.vx * shape.vx + shape.vy * shape.vy);
        if (speed > this.physics.maxVelocity) {
            shape.vx = (shape.vx / speed) * this.physics.maxVelocity;
            shape.vy = (shape.vy / speed) * this.physics.maxVelocity;
        }
        
        // Update position
        shape.x += shape.vx;
        shape.y += shape.vy;
        
        // Bounce off walls
        if (shape.x < shape.size || shape.x > this.canvas.width - shape.size) {
            shape.vx *= -this.physics.bounce;
            shape.x = Math.max(shape.size, Math.min(this.canvas.width - shape.size, shape.x));
            this.onShapeCollision(shape, 'wall');
        }
        
        if (shape.y < shape.size || shape.y > this.canvas.height - shape.size) {
            shape.vy *= -this.physics.bounce;
            shape.y = Math.max(shape.size, Math.min(this.canvas.height - shape.size, shape.y));
            this.onShapeCollision(shape, 'wall');
        }
        
        // Update animation properties
        shape.rotation += shape.rotationSpeed;
        shape.pulse += shape.pulseSpeed;
        shape.life -= shape.decay;
        
        // Add stochastic movement occasionally
        if (Math.random() < 0.01) {
            shape.vx += (Math.random() - 0.5) * 2;
            shape.vy += (Math.random() - 0.5) * 2;
        }
        
        // Create trail
        if (speed > 2) {
            this.addTrail(shape.x, shape.y, shape.color, shape.size * 0.3);
        }
    }
    
    /**
     * Check collisions between shapes
     */
    checkCollisions() {
        for (let i = 0; i < this.shapes.length; i++) {
            for (let j = i + 1; j < this.shapes.length; j++) {
                const shape1 = this.shapes[i];
                const shape2 = this.shapes[j];
                
                const dx = shape2.x - shape1.x;
                const dy = shape2.y - shape1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = (shape1.size + shape2.size) * 0.8;
                
                if (distance < minDistance) {
                    this.resolveCollision(shape1, shape2);
                }
            }
        }
    }
    
    /**
     * Resolve collision between two shapes
     */
    resolveCollision(shape1, shape2) {
        const now = Date.now();
        
        // Prevent rapid collision events
        if (now - shape1.lastCollision < 200 || now - shape2.lastCollision < 200) {
            return;
        }
        
        // Calculate collision response
        const dx = shape2.x - shape1.x;
        const dy = shape2.y - shape1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Separate shapes
        const overlap = (shape1.size + shape2.size) * 0.8 - distance;
        shape1.x -= nx * overlap * 0.5;
        shape1.y -= ny * overlap * 0.5;
        shape2.x += nx * overlap * 0.5;
        shape2.y += ny * overlap * 0.5;
        
        // Exchange velocities (simplified elastic collision)
        const tempVx = shape1.vx;
        const tempVy = shape1.vy;
        shape1.vx = shape2.vx * this.physics.bounce;
        shape1.vy = shape2.vy * this.physics.bounce;
        shape2.vx = tempVx * this.physics.bounce;
        shape2.vy = tempVy * this.physics.bounce;
        
        // Mark collision time
        shape1.lastCollision = now;
        shape2.lastCollision = now;
        
        // Play collision notes
        this.onShapeCollision(shape1, 'shape');
        this.onShapeCollision(shape2, 'shape');
        
        // Create collision effects
        this.createCollisionEffect(shape1, shape2);
    }
    
    /**
     * Handle shape collision events
     */
    onShapeCollision(shape, collisionType) {
        // Play musical note
        this.playShapeNote(shape);
        
        // Visual effects
        shape.glowIntensity = 1.0;
        shape.pulseSpeed *= 2;
        
        // Create particles
        this.createParticles(shape.x, shape.y, 5);
    }
    
    /**
     * Create collision effect between two shapes
     */
    createCollisionEffect(shape1, shape2) {
        const centerX = (shape1.x + shape2.x) / 2;
        const centerY = (shape1.y + shape2.y) / 2;
        
        // Create explosion particles
        this.createParticles(centerX, centerY, 8);
        
        // Play harmonic if both shapes are harmonic
        if (shape1.harmonic && shape2.harmonic && this.audioController.isEnabled) {
            const x = centerX / this.canvas.width;
            const y = centerY / this.canvas.height;
            setTimeout(() => {
                this.audioController.playNote(x, y, 0.8, 'collision_harmony');
            }, 100);
        }
    }
    
    /**
     * Create particle effects
     */
    createParticles(x, y, count) {
        for (let i = 0; i < count; i++) {
            const particle = {
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                size: 2 + Math.random() * 4,
                color: this.getRandomColor(),
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03
            };
            
            this.particles.push(particle);
        }
    }
    
    /**
     * Add trail point
     */
    addTrail(x, y, color, size) {
        this.trails.push({
            x: x,
            y: y,
            color: color,
            size: size,
            life: 1.0,
            decay: 0.05
        });
        
        // Limit trail length
        if (this.trails.length > 100) {
            this.trails.splice(0, 10);
        }
    }
    
    /**
     * Update particles
     */
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            particle.life -= particle.decay;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Update trails
     */
    updateTrails() {
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const trail = this.trails[i];
            trail.life -= trail.decay;
            
            if (trail.life <= 0) {
                this.trails.splice(i, 1);
            }
        }
    }
    
    /**
     * Render all visual elements
     */
    render() {
        // Clear canvas with subtle background
        this.context.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render trails
        this.renderTrails();
        
        // Render shapes
        this.renderShapes();
        
        // Render particles
        this.renderParticles();
    }
    
    /**
     * Render all shapes
     */
    renderShapes() {
        for (const shape of this.shapes) {
            this.renderShape(shape);
        }
    }
    
    /**
     * Render individual shape
     */
    renderShape(shape) {
        this.context.save();
        
        // Set up transform
        this.context.translate(shape.x, shape.y);
        this.context.rotate(shape.rotation);
        
        // Set up style
        const alpha = shape.opacity * shape.life;
        this.context.globalAlpha = alpha;
        
        // Glow effect
        if (shape.glowIntensity > 0) {
            this.context.shadowColor = shape.color;
            this.context.shadowBlur = 20 * shape.glowIntensity;
            shape.glowIntensity *= 0.95;
        }
        
        // Pulsing size
        const pulseSize = shape.size * (1 + Math.sin(shape.pulse) * 0.2);
        
        // Draw shape based on type
        this.context.fillStyle = shape.color;
        this.context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.context.lineWidth = 2;
        
        switch (shape.type) {
            case 'circle':
                this.drawCircle(pulseSize);
                break;
            case 'square':
                this.drawSquare(pulseSize);
                break;
            case 'triangle':
                this.drawTriangle(pulseSize);
                break;
            case 'star':
                this.drawStar(pulseSize);
                break;
            case 'hexagon':
                this.drawHexagon(pulseSize);
                break;
        }
        
        this.context.restore();
    }
    
    /**
     * Draw circle shape
     */
    drawCircle(size) {
        this.context.beginPath();
        this.context.arc(0, 0, size, 0, Math.PI * 2);
        this.context.fill();
        this.context.stroke();
    }
    
    /**
     * Draw square shape
     */
    drawSquare(size) {
        this.context.beginPath();
        this.context.rect(-size, -size, size * 2, size * 2);
        this.context.fill();
        this.context.stroke();
    }
    
    /**
     * Draw triangle shape
     */
    drawTriangle(size) {
        this.context.beginPath();
        this.context.moveTo(0, -size);
        this.context.lineTo(-size * 0.866, size * 0.5);
        this.context.lineTo(size * 0.866, size * 0.5);
        this.context.closePath();
        this.context.fill();
        this.context.stroke();
    }
    
    /**
     * Draw star shape
     */
    drawStar(size) {
        this.context.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5;
            const radius = i % 2 === 0 ? size : size * 0.5;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
                this.context.moveTo(x, y);
            } else {
                this.context.lineTo(x, y);
            }
        }
        this.context.closePath();
        this.context.fill();
        this.context.stroke();
    }
    
    /**
     * Draw hexagon shape
     */
    drawHexagon(size) {
        this.context.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            
            if (i === 0) {
                this.context.moveTo(x, y);
            } else {
                this.context.lineTo(x, y);
            }
        }
        this.context.closePath();
        this.context.fill();
        this.context.stroke();
    }
    
    /**
     * Render trails
     */
    renderTrails() {
        for (const trail of this.trails) {
            this.context.save();
            this.context.globalAlpha = trail.life * 0.3;
            this.context.fillStyle = trail.color;
            this.context.beginPath();
            this.context.arc(trail.x, trail.y, trail.size, 0, Math.PI * 2);
            this.context.fill();
            this.context.restore();
        }
    }
    
    /**
     * Render particles
     */
    renderParticles() {
        for (const particle of this.particles) {
            this.context.save();
            this.context.globalAlpha = particle.life;
            this.context.fillStyle = particle.color;
            this.context.beginPath();
            this.context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.context.fill();
            this.context.restore();
        }
    }
    
    /**
     * Clear all shapes
     */
    clearShapes() {
        this.shapes = [];
        this.particles = [];
        this.trails = [];
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            shapeCount: this.shapes.length,
            particleCount: this.particles.length,
            trailCount: this.trails.length,
            isRunning: this.isRunning
        };
    }
}

// Export for use in other modules
window.ShapesController = ShapesController;