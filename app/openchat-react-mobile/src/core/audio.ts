
import { AppEvents } from './events';

export interface AudioTrack {
    id: string;
    title: string;
    artist?: string;
    cover?: string;
    src: string;
    duration?: number;
}

export enum AudioStatus {
    STOPPED = 'stopped',
    PLAYING = 'playing',
    PAUSED = 'paused',
    BUFFERING = 'buffering'
}

class AudioServiceImpl {
    private audio: HTMLAudioElement;
    private _track: AudioTrack | null = null;
    private _status: AudioStatus = AudioStatus.STOPPED;
    private _currentTime: number = 0;
    private _duration: number = 0;

    constructor() {
        this.audio = new Audio();
        this.audio.preload = 'auto'; // Optimize for mobile
        
        // Bind Events
        this.audio.ontimeupdate = () => {
            this._currentTime = this.audio.currentTime;
            this.emitChange();
        };
        
        this.audio.onended = () => {
            this._status = AudioStatus.STOPPED;
            this._currentTime = 0;
            this.emitChange();
        };

        this.audio.onplaying = () => {
            this._status = AudioStatus.PLAYING;
            this.emitChange();
        };

        this.audio.onpause = () => {
            // Distinguish between pause and buffering/seeking if needed
            if (this._status !== AudioStatus.STOPPED) {
                this._status = AudioStatus.PAUSED;
            }
            this.emitChange();
        };

        this.audio.onwaiting = () => {
            this._status = AudioStatus.BUFFERING;
            this.emitChange();
        };

        this.audio.onloadedmetadata = () => {
            this._duration = this.audio.duration;
            this.emitChange();
        };
        
        // Handle iOS silent switch / background audio (Partial support via Metadata)
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.resume());
            navigator.mediaSession.setActionHandler('pause', () => this.pause());
        }
    }

    public get track() { return this._track; }
    public get status() { return this._status; }
    public get currentTime() { return this._currentTime; }
    public get duration() { return this._duration; }

    public play(track: AudioTrack) {
        // If same track, just toggle
        if (this._track?.id === track.id) {
            this.toggle();
            return;
        }

        this._track = track;
        this.audio.src = track.src;
        this.audio.load();
        
        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Auto-play prevented:", error);
                this._status = AudioStatus.PAUSED; // Fallback state
                this.emitChange();
            });
        }
        
        this.updateMediaSession();
        this.emitChange();
    }

    public resume() {
        if (this.audio.src) {
            this.audio.play();
        }
    }

    public pause() {
        this.audio.pause();
    }

    public toggle() {
        if (this._status === AudioStatus.PLAYING) {
            this.pause();
        } else {
            this.resume();
        }
    }

    public seek(time: number) {
        if (this.audio.readyState > 0) {
            this.audio.currentTime = time;
        }
    }
    
    public stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this._status = AudioStatus.STOPPED;
        this._track = null;
        this.emitChange();
    }

    private updateMediaSession() {
        if ('mediaSession' in navigator && this._track) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: this._track.title,
                artist: this._track.artist || 'OpenChat',
                artwork: this._track.cover ? [{ src: this._track.cover, sizes: '512x512', type: 'image/jpeg' }] : []
            });
        }
    }

    private emitChange() {
        AppEvents.emit('sys:audio_change', {
            track: this._track,
            status: this._status,
            currentTime: this._currentTime,
            duration: this._duration
        });
    }
    
    // React Hook Helper
    public subscribe(callback: () => void): () => void {
        return AppEvents.on('sys:audio_change', callback);
    }
}

export const AudioService = new AudioServiceImpl();
