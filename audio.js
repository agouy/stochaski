/**
 * Audio Controller for Stochastic Music Generation
 * Handles Web Audio API, multiple scales, and stochastic sound generation
 */

class AudioController {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
        this.isEnabled = false;
        this.currentScale = 'major';
        this.baseFrequency = 261.63; // C4
        this.activeOscillators = new Map();
        this.noteCount = 0;
        
        // Musical scales (in semitones from root)
        this.scales = {
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            pentatonic: [0, 2, 4, 7, 9],
            blues: [0, 3, 5, 6, 7, 10],
            chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        };
        
        // Initialize if possible
        this.checkBrowserSupport();
    }
    
    /**
     * Check if Web Audio API is supported
     */
    checkBrowserSupport() {
        if (!window.AudioContext && !window.webkitAudioContext) {
            console.error('Web Audio API not supported in this browser');
            return false;
        }
        return true;
    }
    
    /**
     * Initialize audio context and set up audio graph
     */
    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            // Create audio context
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.3; // Start with moderate volume
            
            // Resume context if suspended (required by browser policies)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.isInitialized = true;
            console.log('Audio system initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize audio system:', error);
            return false;
        }
    }
    
    /**
     * Enable audio playback
     */
    async enable() {
        if (!this.isInitialized) {
            const success = await this.initialize();
            if (!success) return false;
        }
        
        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            this.isEnabled = true;
            return true;
        } catch (error) {
            console.error('Failed to enable audio:', error);
            return false;
        }
    }
    
    /**
     * Disable audio playback
     */
    disable() {
        this.isEnabled = false;
        this.stopAllNotes();
    }
    
    /**
     * Set the master volume (0-1)
     */
    setVolume(volume) {
        if (this.masterGain) {
            // Smooth volume changes to avoid clicks
            this.masterGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
        }
    }
    
    /**
     * Change the current musical scale
     */
    setScale(scaleName) {
        if (this.scales[scaleName]) {
            this.currentScale = scaleName;
            console.log(`Scale changed to: ${scaleName}`);
        }
    }
    
    /**
     * Convert a normalized coordinate (0-1) to a frequency based on current scale
     */
    coordinateToFrequency(x, y) {
        const scale = this.scales[this.currentScale];
        const octaves = 3; // Cover 3 octaves
        
        // Map X coordinate to scale degree
        const scaleIndex = Math.floor(x * scale.length * octaves);
        const octave = Math.floor(scaleIndex / scale.length);
        const degree = scaleIndex % scale.length;
        
        // Calculate semitones from base frequency
        const semitones = scale[degree] + (octave * 12);
        
        // Add stochastic elements based on Y coordinate
        const randomOffset = (Math.random() - 0.5) * 2 * y; // More randomness with higher Y
        
        // Convert to frequency
        const frequency = this.baseFrequency * Math.pow(2, (semitones + randomOffset) / 12);
        
        return Math.max(80, Math.min(2000, frequency)); // Clamp to reasonable range
    }
    
    /**
     * Play a musical note with stochastic elements
     */
    playNote(x, y, duration = 0.8, noteId = null) {
        if (!this.isEnabled || !this.audioContext) return null;
        
        try {
            const frequency = this.coordinateToFrequency(x, y);
            const actualNoteId = noteId || `note_${Date.now()}_${Math.random()}`;
            
            // Create oscillator
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Connect audio graph
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Set oscillator properties with stochastic elements
            const waveforms = ['sine', 'triangle', 'sawtooth'];
            const randomWaveform = waveforms[Math.floor(Math.random() * waveforms.length)];
            oscillator.type = y > 0.7 ? randomWaveform : 'sine'; // More complex waveforms for higher positions
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            
            // Add frequency modulation for more interesting sounds
            if (Math.random() > 0.7) {
                const lfo = this.audioContext.createOscillator();
                const lfoGain = this.audioContext.createGain();
                
                lfo.frequency.value = 2 + Math.random() * 4; // 2-6 Hz vibrato
                lfoGain.gain.value = frequency * 0.02; // 2% modulation
                
                lfo.connect(lfoGain);
                lfoGain.connect(oscillator.frequency);
                lfo.start();
                
                // Store LFO for cleanup
                this.activeOscillators.set(actualNoteId + '_lfo', { oscillator: lfo, gainNode: lfoGain });
            }
            
            // Set envelope (ADSR-like)
            const now = this.audioContext.currentTime;
            const attack = 0.1;
            const decay = 0.2;
            const sustain = 0.6;
            const release = 0.3;
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.8 * y, now + attack); // Volume based on Y position
            gainNode.gain.linearRampToValueAtTime(sustain * y, now + attack + decay);
            gainNode.gain.setValueAtTime(sustain * y, now + duration - release);
            gainNode.gain.linearRampToValueAtTime(0, now + duration);
            
            // Start and stop oscillator
            oscillator.start(now);
            oscillator.stop(now + duration);
            
            // Store active oscillator
            this.activeOscillators.set(actualNoteId, { oscillator, gainNode });
            
            // Clean up when finished
            oscillator.onended = () => {
                this.activeOscillators.delete(actualNoteId);
                this.activeOscillators.delete(actualNoteId + '_lfo');
            };
            
            this.noteCount++;
            
            // Generate stochastic harmony (30% chance)
            if (Math.random() > 0.7) {
                setTimeout(() => {
                    const harmonyX = x + (Math.random() - 0.5) * 0.3;
                    const harmonyY = y + (Math.random() - 0.5) * 0.2;
                    this.playNote(
                        Math.max(0, Math.min(1, harmonyX)),
                        Math.max(0, Math.min(1, harmonyY)),
                        duration * 0.7,
                        actualNoteId + '_harmony'
                    );
                }, 50 + Math.random() * 100);
            }
            
            return actualNoteId;
            
        } catch (error) {
            console.error('Error playing note:', error);
            return null;
        }
    }
    
    /**
     * Stop a specific note by ID
     */
    stopNote(noteId) {
        if (this.activeOscillators.has(noteId)) {
            const { oscillator, gainNode } = this.activeOscillators.get(noteId);
            
            try {
                // Quick fade out
                gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);
                oscillator.stop(this.audioContext.currentTime + 0.1);
            } catch (error) {
                // Oscillator might already be stopped
            }
            
            this.activeOscillators.delete(noteId);
        }
    }
    
    /**
     * Stop all currently playing notes
     */
    stopAllNotes() {
        for (const [noteId] of this.activeOscillators) {
            this.stopNote(noteId);
        }
        this.activeOscillators.clear();
    }
    
    /**
     * Generate a stochastic musical phrase based on motion data
     */
    generatePhrase(motionData) {
        if (!this.isEnabled || !motionData || motionData.length === 0) return;
        
        const phraseLength = Math.min(8, motionData.length);
        const baseDelay = 100;
        
        for (let i = 0; i < phraseLength; i++) {
            const point = motionData[i];
            const delay = baseDelay * i + Math.random() * 50;
            
            setTimeout(() => {
                this.playNote(point.x, point.y, 0.5 + Math.random() * 0.5);
            }, delay);
        }
    }
    
    /**
     * Get current audio stats
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            isEnabled: this.isEnabled,
            activeNotes: this.activeOscillators.size,
            noteCount: this.noteCount,
            currentScale: this.currentScale,
            audioContextState: this.audioContext ? this.audioContext.state : 'unavailable'
        };
    }
    
    /**
     * Create a test sound to verify audio is working
     */
    testSound() {
        if (this.isEnabled) {
            this.playNote(0.5, 0.5, 1.0, 'test_note');
            return true;
        }
        return false;
    }
}

// Export for use in other modules
window.AudioController = AudioController;