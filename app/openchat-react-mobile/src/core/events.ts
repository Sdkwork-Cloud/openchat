
type Handler = (payload: any) => void;

class EventBus {
    private listeners: Record<string, Handler[]> = {};

    on(event: string, handler: Handler) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(handler);
        return () => this.off(event, handler);
    }

    off(event: string, handler: Handler) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }

    emit(event: string, payload?: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(h => h(payload));
        }
    }
}

export const AppEvents = new EventBus();

// Event Constants
export const EVENTS = {
    DATA_CHANGE: 'sys:data_change', // Payload: { key: string, action: 'save'|'delete', id?: string }
    THEME_CHANGE: 'ui:theme_change',
    STATUS_CHANGE: 'sys:status_change', // Payload: { status: 'idle'|'loading'|'success'|'error', message?: string }
};
