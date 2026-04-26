/**
 * THREE-SCENE.JS
 * Creates and manages the Three.js animated background
 * Emotion-responsive particle system with smooth transitions
 */

class ThreeScene {
    constructor() {
        this.container = document.getElementById('three-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.particleGeometry = null;
        this.particleMaterial = null;
        this.particleCount = 1500;
        this.currentEmotion = 'neutral';
        
        // Animation parameters (emotion-dependent)
        this.animationParams = {
            speed: 0.5,
            amplitude: 1.0,
            waveFrequency: 0.5
        };
        
        this.init();
        this.animate();
        this.handleResize();
    }
    
    /**
     * Initialize Three.js scene, camera, and renderer
     */
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 50;
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);
        
        // Create particles
        this.createParticles();
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
    }
    
    /**
     * Create particle system
     */
    createParticles() {
        // Create geometry
        this.particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        
        // Set initial particle positions and colors
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // Random positions
            positions[i3] = (Math.random() - 0.5) * 100;
            positions[i3 + 1] = (Math.random() - 0.5) * 100;
            positions[i3 + 2] = (Math.random() - 0.5) * 100;
            
            // Default colors (Neutral = grayish blue)
            colors[i3] = 0.5;     
            colors[i3 + 1] = 0.6; 
            colors[i3 + 2] = 0.7;  
        }
        
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Create material
        this.particleMaterial = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Create particle system
        this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.scene.add(this.particles);
    }
    
    /**
     * Update scene based on emotion
     * @param {string} emotion - Current emotion (happy, calm, sad, energetic, neutral)
     */
    updateEmotion(emotion) {
        this.currentEmotion = emotion;
        
        // Emotion-specific parameters
        const emotionSettings = {
            happy: {
                color: { r: 1.0, g: 0.84, b: 0.0 },
                speed: 0.8,
                amplitude: 1.2,
                waveFrequency: 0.6,
                particleSize: 0.5
            },
            calm: {
                color: { r: 0.29, g: 0.56, b: 0.89 },
                speed: 0.3,
                amplitude: 0.5,
                waveFrequency: 0.3,
                particleSize: 0.4
            },
            sad: {
                color: { r: 0.61, g: 0.35, b: 0.71 },
                speed: 0.2,
                amplitude: 0.7,
                waveFrequency: 0.2,
                particleSize: 0.6
            },
            energetic: {
                color: { r: 1.0, g: 0.39, b: 0.28 },
                speed: 1.5,
                amplitude: 2.0,
                waveFrequency: 1.0,
                particleSize: 0.7
            },
            neutral: {
                color: { r: 0.5, g: 0.6, b: 0.7 },
                speed: 0.4,
                amplitude: 0.8,
                waveFrequency: 0.4,
                particleSize: 0.5
            }
        };
        
        const settings = emotionSettings[emotion.toLowerCase()] || emotionSettings.neutral;
        
        // Smoothly transition animation parameters
        this.animateTransition(this.animationParams, settings, 1000);
        
        // Update particle colors
        this.updateParticleColors(settings.color);
        
        // Update particle size
        this.particleMaterial.size = settings.particleSize;
    }
    
    /**
     * Smoothly transition parameters
     * @param {object} current - Current parameters
     * @param {object} target - Target parameters
     * @param {number} duration - Transition duration in ms
     */
    animateTransition(current, target, duration) {
        const startTime = Date.now();
        const startValues = { ...current };
        
        const transition = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-in-out function
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            current.speed = startValues.speed + (target.speed - startValues.speed) * eased;
            current.amplitude = startValues.amplitude + (target.amplitude - startValues.amplitude) * eased;
            current.waveFrequency = startValues.waveFrequency + (target.waveFrequency - startValues.waveFrequency) * eased;
            
            if (progress < 1) {
                requestAnimationFrame(transition);
            }
        };
        
        transition();
    }
    
    /**
     * Update particle colors
     * @param {object} targetColor - Target RGB color
     */
    updateParticleColors(targetColor) {
        const colors = this.particleGeometry.attributes.color.array;
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // Add subtle variation to colors
            const variation = Math.random() * 0.2 - 0.1;
            colors[i3] = Math.max(0, Math.min(1, targetColor.r + variation));
            colors[i3 + 1] = Math.max(0, Math.min(1, targetColor.g + variation));
            colors[i3 + 2] = Math.max(0, Math.min(1, targetColor.b + variation));
        }
        
        this.particleGeometry.attributes.color.needsUpdate = true;
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const time = Date.now() * 0.001; // Convert to seconds
        const positions = this.particleGeometry.attributes.position.array;
        
        // Animate particles with wave motion
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            const x = positions[i3];
            const z = positions[i3 + 2];
            
            // Calculate wave motion based on emotion
            const distance = Math.sqrt(x * x + z * z);
            const wave = Math.sin(distance * this.animationParams.waveFrequency - time * this.animationParams.speed);
            
            positions[i3 + 1] += wave * this.animationParams.amplitude * 0.01;
            
            // Gentle rotation
            const angle = time * this.animationParams.speed * 0.1;
            const cosAngle = Math.cos(angle);
            const sinAngle = Math.sin(angle);
            
            const newX = x * cosAngle - z * sinAngle;
            const newZ = x * sinAngle + z * cosAngle;
            
            positions[i3] = newX;
            positions[i3 + 2] = newZ;
        }
        
        this.particleGeometry.attributes.position.needsUpdate = true;
        
        // Slowly rotate camera for dynamic effect
        if (this.camera) {
            this.camera.position.x = Math.sin(time * 0.1) * 2;
            this.camera.position.y = Math.cos(time * 0.15) * 2;
            this.camera.lookAt(this.scene.position);
        }
        
        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        window.addEventListener('resize', () => {
            if (this.camera) {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
            }
            
            if (this.renderer) {
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }
        });
    }
    
    /**
     * Cleanup
     */
    dispose() {
        this.particleGeometry.dispose();
        this.particleMaterial.dispose();
        this.renderer.dispose();
    }
}

// Initialize Three.js scene when DOM is ready
window.threeScene = new ThreeScene();
