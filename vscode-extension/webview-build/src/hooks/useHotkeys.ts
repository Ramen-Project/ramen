import { useEffect, useRef } from 'react';

export interface HotkeyConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description?: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export interface HotkeyHandler {
  config: HotkeyConfig;
  callback: (event: KeyboardEvent) => void;
}

export class HotkeyManager {
  private static instance: HotkeyManager;
  private handlers: Map<string, HotkeyHandler[]> = new Map();
  private isListening = false;

  static getInstance(): HotkeyManager {
    if (!HotkeyManager.instance) {
      HotkeyManager.instance = new HotkeyManager();
    }
    return HotkeyManager.instance;
  }

  private getHotkeyId(config: HotkeyConfig): string {
    const modifiers = [
      config.ctrl && 'ctrl',
      config.shift && 'shift', 
      config.alt && 'alt',
      config.meta && 'meta'
    ].filter(Boolean).join('+');
    
    return modifiers ? `${modifiers}+${config.key.toLowerCase()}` : config.key.toLowerCase();
  }

  private matchesConfig(event: KeyboardEvent, config: HotkeyConfig): boolean {
    return (
      event.key.toLowerCase() === config.key.toLowerCase() &&
      !!event.ctrlKey === !!config.ctrl &&
      !!event.shiftKey === !!config.shift &&
      !!event.altKey === !!config.alt &&
      !!event.metaKey === !!config.meta
    );
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    // Skip if user is typing in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('[role="textbox"]') ||
        target.closest('input')) {
      return;
    }

    for (const [, handlers] of this.handlers) {
      for (const handler of handlers) {
        if (this.matchesConfig(event, handler.config)) {
          if (handler.config.preventDefault) {
            event.preventDefault();
          }
          if (handler.config.stopPropagation) {
            event.stopPropagation();
          }
          
          console.log(`Hotkey triggered: ${this.getHotkeyId(handler.config)}`);
          handler.callback(event);
          return;
        }
      }
    }
  };

  register(config: HotkeyConfig, callback: (event: KeyboardEvent) => void): () => void {
    const id = this.getHotkeyId(config);
    const handler: HotkeyHandler = { config, callback };
    
    if (!this.handlers.has(id)) {
      this.handlers.set(id, []);
    }
    this.handlers.get(id)!.push(handler);

    this.startListening();

    // Return unregister function
    return () => {
      const handlers = this.handlers.get(id);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
          if (handlers.length === 0) {
            this.handlers.delete(id);
          }
        }
      }
      
      if (this.handlers.size === 0) {
        this.stopListening();
      }
    };
  }

  private startListening() {
    if (!this.isListening) {
      window.addEventListener('keydown', this.handleKeyDown);
      this.isListening = true;
    }
  }

  private stopListening() {
    if (this.isListening) {
      window.removeEventListener('keydown', this.handleKeyDown);
      this.isListening = false;
    }
  }

  getRegisteredHotkeys(): { id: string; config: HotkeyConfig }[] {
    const result: { id: string; config: HotkeyConfig }[] = [];
    for (const [id, handlers] of this.handlers) {
      if (handlers.length > 0) {
        result.push({ id, config: handlers[0].config });
      }
    }
    return result;
  }
}

export function useHotkeys(config: HotkeyConfig, callback: (event: KeyboardEvent) => void, deps: any[] = []) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const manager = HotkeyManager.getInstance();
    const unregister = manager.register(config, (event) => callbackRef.current(event));
    
    return unregister;
  }, [config.key, config.ctrl, config.shift, config.alt, config.meta, ...deps]);
}

// Convenience functions for common hotkey patterns
export function useHotkey(key: string, callback: (event: KeyboardEvent) => void, deps: any[] = []) {
  return useHotkeys({ key }, callback, deps);
}

export function useCtrlHotkey(key: string, callback: (event: KeyboardEvent) => void, deps: any[] = []) {
  return useHotkeys({ key, ctrl: true, preventDefault: true }, callback, deps);
}

export function useShiftHotkey(key: string, callback: (event: KeyboardEvent) => void, deps: any[] = []) {
  return useHotkeys({ key, shift: true }, callback, deps);
}