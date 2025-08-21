// audio.js - Web Audio API sound generation

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
        this.currentScale = 'major';
        
        // Musical scales (note offsets from root in semitones)
        this.scales = {
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            pentatonic: [0, 2, 4, 7, 9],
            blues: [0, 3, 5, 6, 7, 10],
            chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        };
        
        // Base frequency for C4
        this.baseFreq = 261.63;
        this.baseOctave = 4;
        
        // Sound settings
        this.volume = 0.6;
        this.reverbEnabled = true;
        this.delayEnabled = true;
        
        // Effects
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        
        // Active voices for polyphonic playback
        this.activeVoices = new Map();
        this.maxVoices = 8;
        
        // Stochastic elements
        this.randomization = 0.1; // 0-1, amount of random pitch/timing variation
    }

    async initialize() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
            
            // Set up effects chain
            await this.setupEffects();
            
            // Connect to destination
            this.masterGain.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            return false;
        }
    }

    async setupEffects() {
        // Create reverb
        this.reverb = this.audioContext.createConvolver();
        this.reverb.buffer = await this.createReverbImpulse();
        
        // Create delay
        this.delay = this.audioContext.createDelay(1.0);
        this.delay.delayTime.setValueAtTime(0.2, this.audioContext.currentTime);
        
        const delayFeedback = this.audioContext.createGain();
        delayFeedback.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        
        const delayWet = this.audioContext.createGain();
        delayWet.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        
        // Create filter
        this.filter = this.audioContext.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.setValueAtTime(8000, this.audioContext.currentTime);
        this.filter.Q.setValueAtTime(1, this.audioContext.currentTime);
        
        // Connect delay chain
        this.delay.connect(delayFeedback);
        delayFeedback.connect(this.delay);
        this.delay.connect(delayWet);
        
        // Connect effects to master
        delayWet.connect(this.masterGain);
        this.reverb.connect(this.masterGain);
    }

    async createReverbImpulse() {
        const length = this.audioContext.sampleRate * 2; // 2 seconds
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const n = length - i;
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(n / length, 2);
            }
        }
        
        return impulse;
    }

    // Resume audio context if suspended (required by browser policies)
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    setScale(scaleName) {
        if (this.scales[scaleName]) {
            this.currentScale = scaleName;
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        }
    }

    setRandomization(amount) {
        this.randomization = Math.max(0, Math.min(1, amount));
    }

    playNote(noteIndex, intensity = 1.0, duration = 1.0) {
        if (!this.isInitialized || !this.audioContext) {
            return;
        }

        // Ensure audio context is running
        this.resume();

        // Limit active voices
        if (this.activeVoices.size >= this.maxVoices) {
            // Remove oldest voice
            const oldestVoice = this.activeVoices.keys().next().value;
            this.stopVoice(oldestVoice);
        }

        // Get frequency for the note
        const frequency = this.getNoteFrequency(noteIndex);
        
        // Apply stochastic variations
        const randomPitchOffset = (Math.random() - 0.5) * this.randomization * 100; // +/- 50 cents
        const finalFrequency = frequency * Math.pow(2, randomPitchOffset / 1200);
        
        const randomDuration = duration * (0.8 + Math.random() * 0.4 * this.randomization);
        const randomIntensity = intensity * (0.8 + Math.random() * 0.4 * this.randomization);

        // Create voice
        const voiceId = Date.now() + Math.random();
        const voice = this.createVoice(finalFrequency, randomIntensity, randomDuration);
        
        this.activeVoices.set(voiceId, voice);
        
        // Auto-cleanup after duration
        setTimeout(() => {
            this.stopVoice(voiceId);
        }, randomDuration * 1000);

        return voiceId;
    }

    createVoice(frequency, intensity, duration) {
        const now = this.audioContext.currentTime;
        
        // Create oscillators for a richer sound
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const osc3 = this.audioContext.createOscillator();
        
        // Set frequencies (fundamental + harmonics)
        osc1.frequency.setValueAtTime(frequency, now);
        osc2.frequency.setValueAtTime(frequency * 2, now); // Octave
        osc3.frequency.setValueAtTime(frequency * 3, now); // Fifth
        
        // Set waveforms
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc3.type = 'sawtooth';
        
        // Create gain nodes for each oscillator
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const gain3 = this.audioContext.createGain();
        
        // Set gain levels
        gain1.gain.setValueAtTime(intensity * 0.6, now);
        gain2.gain.setValueAtTime(intensity * 0.3, now);
        gain3.gain.setValueAtTime(intensity * 0.1, now);
        
        // Create envelope
        const envelope = this.audioContext.createGain();
        envelope.gain.setValueAtTime(0, now);
        
        // ADSR envelope
        const attackTime = 0.01;
        const decayTime = 0.1;
        const sustainLevel = 0.7;
        const releaseTime = Math.max(0.1, duration * 0.3);
        
        envelope.gain.linearRampToValueAtTime(intensity, now + attackTime);
        envelope.gain.linearRampToValueAtTime(intensity * sustainLevel, now + attackTime + decayTime);
        envelope.gain.setValueAtTime(intensity * sustainLevel, now + duration - releaseTime);
        envelope.gain.linearRampToValueAtTime(0, now + duration);
        
        // Connect oscillators
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        
        gain1.connect(envelope);
        gain2.connect(envelope);
        gain3.connect(envelope);
        
        // Connect to effects
        envelope.connect(this.filter);
        this.filter.connect(this.masterGain);
        
        if (this.reverbEnabled) {
            const reverbSend = this.audioContext.createGain();
            reverbSend.gain.setValueAtTime(0.2, now);
            envelope.connect(reverbSend);
            reverbSend.connect(this.reverb);
        }
        
        if (this.delayEnabled) {
            const delaySend = this.audioContext.createGain();
            delaySend.gain.setValueAtTime(0.1, now);
            envelope.connect(delaySend);
            delaySend.connect(this.delay);
        }
        
        // Start oscillators
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        
        // Stop oscillators
        osc1.stop(now + duration);
        osc2.stop(now + duration);
        osc3.stop(now + duration);
        
        return {
            oscillators: [osc1, osc2, osc3],
            gains: [gain1, gain2, gain3],
            envelope: envelope,
            startTime: now,
            duration: duration
        };
    }

    stopVoice(voiceId) {
        if (this.activeVoices.has(voiceId)) {
            const voice = this.activeVoices.get(voiceId);
            const now = this.audioContext.currentTime;
            
            // Quick fade out
            voice.envelope.gain.cancelScheduledValues(now);
            voice.envelope.gain.setValueAtTime(voice.envelope.gain.value, now);
            voice.envelope.gain.linearRampToValueAtTime(0, now + 0.01);
            
            this.activeVoices.delete(voiceId);
        }
    }

    getNoteFrequency(noteIndex) {
        // Get the scale
        const scale = this.scales[this.currentScale];
        const scaleLength = scale.length;
        
        // Map noteIndex to scale degree and octave
        const scaleDegree = noteIndex % scaleLength;
        const octaveOffset = Math.floor(noteIndex / scaleLength);
        
        // Get semitone offset from root
        const semitoneOffset = scale[scaleDegree] + (octaveOffset * 12);
        
        // Calculate frequency
        return this.baseFreq * Math.pow(2, semitoneOffset / 12);
    }

    // Play ambient/generative sounds
    playAmbientLayer() {
        if (!this.isInitialized) return;
        
        const scale = this.scales[this.currentScale];
        const noteIndex = Math.floor(Math.random() * scale.length);
        const frequency = this.getNoteFrequency(noteIndex);
        
        const now = this.audioContext.currentTime;
        
        // Create a soft pad sound
        const osc = this.audioContext.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency * 0.5, now); // Lower octave
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 2);
        gain.gain.setValueAtTime(0.1, now + 8);
        gain.gain.linearRampToValueAtTime(0, now + 10);
        
        osc.connect(gain);
        gain.connect(this.reverb);
        
        osc.start(now);
        osc.stop(now + 10);
    }

    // Create percussion/rhythm sounds
    playPercussion(type = 'kick') {
        if (!this.isInitialized) return;
        
        const now = this.audioContext.currentTime;
        
        if (type === 'kick') {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.8, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'hihat') {
            // Create noise for hi-hat
            const bufferSize = this.audioContext.sampleRate * 0.1;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            
            const noise = this.audioContext.createBufferSource();
            noise.buffer = buffer;
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(8000, now);
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(now);
        }
    }

    // Cleanup
    dispose() {
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.activeVoices.clear();
    }
}

// Export for use in other modules
window.AudioManager = AudioManager;