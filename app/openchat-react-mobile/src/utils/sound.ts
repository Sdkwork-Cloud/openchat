
/**
 * Procedural Sound Engine using Web Audio API.
 * Generates UI sounds in real-time without external assets.
 * Zero latency, zero file size.
 */

let audioCtx: AudioContext | null = null;

const getCtx = () => {
    if (!audioCtx) {
        // Initialize on first user interaction usually, but we define it lazily
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        if (Ctx) audioCtx = new Ctx();
    }
    return audioCtx;
};

// Helper: Create a short burst of sound
const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
    const ctx = getCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
};

export const Sound = {
    // Crisp click for buttons/tabs
    click: () => {
        playTone(600, 'sine', 0.05, 0.05);
    },
    
    // Soft pop for message bubbles
    pop: () => {
        const ctx = getCtx();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    },

    // Success chime
    success: () => {
        setTimeout(() => playTone(500, 'sine', 0.1, 0.1), 0);
        setTimeout(() => playTone(800, 'sine', 0.2, 0.1), 100);
    },

    // Refresh swoosh
    refresh: () => {
        const ctx = getCtx();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        // White noise buffer would be better for swoosh, but triangle wave slide works for UI
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    },
    
    // Tiny tick for typing
    tick: () => {
        playTone(800, 'square', 0.01, 0.02);
    }
};
