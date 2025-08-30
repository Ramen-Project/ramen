import { errorHandler, RamenError, ErrorCategory, ErrorSeverity } from '../core/errorHandler';

/**
 * Debounce options
 */
export interface DebounceOptions {
    leading?: boolean;  // Execute on leading edge
    trailing?: boolean; // Execute on trailing edge (default: true)
    maxWait?: number;   // Maximum time to wait
}

/**
 * Throttle options
 */
export interface ThrottleOptions {
    leading?: boolean;  // Execute on leading edge (default: true)
    trailing?: boolean; // Execute on trailing edge (default: true)
}

/**
 * Debounced function interface
 */
export interface DebouncedFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): void;
    cancel(): void;
    flush(): void;
    pending(): boolean;
}

/**
 * Throttled function interface
 */
export interface ThrottledFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): void;
    cancel(): void;
    flush(): void;
}

/**
 * Create a debounced function
 * Delays invoking func until after wait milliseconds have elapsed since the last time it was invoked
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    options: DebounceOptions = {}
): DebouncedFunction<T> {
    let timeout: NodeJS.Timeout | null = null;
    let lastArgs: Parameters<T> | null = null;
    let lastThis: any = null;
    let lastCallTime: number | null = null;
    let lastInvokeTime = 0;
    let maxTimeout: NodeJS.Timeout | null = null;
    
    const {
        leading = false,
        trailing = true,
        maxWait
    } = options;
    
    const maxing = maxWait !== undefined;
    const maxDelay = maxing ? Math.max(maxWait, wait) : 0;
    
    function invokeFunc(time: number) {
        const args = lastArgs;
        const thisArg = lastThis;
        
        lastArgs = null;
        lastThis = null;
        lastInvokeTime = time;
        
        try {
            return func.apply(thisArg, args!);
        } catch (error) {
            errorHandler.handle(
                new RamenError(
                    `Debounced function error: ${error}`,
                    ErrorCategory.UNKNOWN,
                    ErrorSeverity.WARNING,
                    { func: func.name, error }
                )
            );
        }
    }
    
    function leadingEdge(time: number) {
        lastInvokeTime = time;
        
        timeout = setTimeout(timerExpired, wait);
        
        if (maxing) {
            maxTimeout = setTimeout(maxTimerExpired, maxDelay);
        }
        
        return leading ? invokeFunc(time) : undefined;
    }
    
    function timerExpired() {
        const time = Date.now();
        
        if (shouldInvoke(time)) {
            return trailingEdge(time);
        }
        
        timeout = setTimeout(timerExpired, remainingWait(time));
    }
    
    function maxTimerExpired() {
        if (timeout) {
            clearTimeout(timeout);
        }
        
        const time = Date.now();
        
        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        
        lastArgs = null;
        lastThis = null;
    }
    
    function trailingEdge(time: number) {
        timeout = null;
        
        if (maxTimeout) {
            clearTimeout(maxTimeout);
            maxTimeout = null;
        }
        
        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        
        lastArgs = null;
        lastThis = null;
    }
    
    function shouldInvoke(time: number): boolean {
        const timeSinceLastCall = lastCallTime ? time - lastCallTime : 0;
        const timeSinceLastInvoke = time - lastInvokeTime;
        
        return !lastCallTime ||
            timeSinceLastCall >= wait ||
            timeSinceLastCall < 0 ||
            (maxing && timeSinceLastInvoke >= maxDelay);
    }
    
    function remainingWait(time: number): number {
        const timeSinceLastCall = time - (lastCallTime || 0);
        const timeSinceLastInvoke = time - lastInvokeTime;
        const timeWaiting = wait - timeSinceLastCall;
        
        return maxing
            ? Math.min(timeWaiting, maxDelay - timeSinceLastInvoke)
            : timeWaiting;
    }
    
    function debounced(this: any, ...args: Parameters<T>): void {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);
        
        lastArgs = args;
        lastThis = this;
        lastCallTime = time;
        
        if (isInvoking) {
            if (!timeout) {
                return leadingEdge(time);
            }
            
            if (maxing) {
                if (timeout) {
                    clearTimeout(timeout);
                }
                timeout = setTimeout(timerExpired, wait);
                return invokeFunc(time);
            }
        }
        
        if (!timeout) {
            timeout = setTimeout(timerExpired, wait);
        }
    }
    
    debounced.cancel = function() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        
        if (maxTimeout) {
            clearTimeout(maxTimeout);
            maxTimeout = null;
        }
        
        lastInvokeTime = 0;
        lastArgs = null;
        lastThis = null;
        lastCallTime = null;
    };
    
    debounced.flush = function() {
        if (timeout) {
            trailingEdge(Date.now());
        }
    };
    
    debounced.pending = function() {
        return timeout !== null;
    };
    
    return debounced;
}

/**
 * Create a throttled function
 * Only invokes func at most once per every wait milliseconds
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    options: ThrottleOptions = {}
): ThrottledFunction<T> {
    const {
        leading = true,
        trailing = true
    } = options;
    
    return debounce(func, wait, {
        leading,
        trailing,
        maxWait: wait
    });
}

/**
 * Batch multiple function calls into a single execution
 */
export class BatchProcessor<T> {
    private items: T[] = [];
    private timer: NodeJS.Timeout | null = null;
    private processing = false;
    
    constructor(
        private processor: (items: T[]) => Promise<void>,
        private batchSize = 50,
        private delay = 100
    ) {}
    
    add(item: T): void {
        this.items.push(item);
        
        if (this.items.length >= this.batchSize) {
            this.flush();
        } else {
            this.scheduleFlush();
        }
    }
    
    addMany(items: T[]): void {
        this.items.push(...items);
        
        if (this.items.length >= this.batchSize) {
            this.flush();
        } else {
            this.scheduleFlush();
        }
    }
    
    private scheduleFlush(): void {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        
        this.timer = setTimeout(() => {
            this.flush();
        }, this.delay);
    }
    
    async flush(): Promise<void> {
        if (this.processing || this.items.length === 0) {
            return;
        }
        
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        
        this.processing = true;
        const batch = this.items.splice(0, this.batchSize);
        
        try {
            await this.processor(batch);
            
            // Process remaining items if any
            if (this.items.length > 0) {
                setTimeout(() => this.flush(), 0);
            }
        } catch (error) {
            errorHandler.handle(
                new RamenError(
                    `Batch processing error: ${error}`,
                    ErrorCategory.UNKNOWN,
                    ErrorSeverity.ERROR,
                    { batchSize: batch.length, error }
                )
            );
        } finally {
            this.processing = false;
        }
    }
    
    get size(): number {
        return this.items.length;
    }
    
    get isProcessing(): boolean {
        return this.processing;
    }
    
    clear(): void {
        this.items = [];
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
    func: T,
    resolver?: (...args: Parameters<T>) => string
): T {
    const cache = new Map<string, ReturnType<T>>();
    const maxCacheSize = 100;
    
    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = resolver ? resolver(...args) : JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key)!;
        }
        
        const result = func(...args);
        
        // Limit cache size
        if (cache.size >= maxCacheSize) {
            const firstKey = cache.keys().next().value;
            if (firstKey !== undefined) {
                cache.delete(firstKey);
            }
        }
        
        cache.set(key, result);
        return result;
    }) as T;
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private queue: Array<() => void> = [];
    
    constructor(
        private maxTokens: number,
        private refillRate: number, // tokens per second
        private maxQueueSize = 100
    ) {
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
        
        // Start refill timer
        setInterval(() => this.refill(), 1000);
    }
    
    async acquire(): Promise<void> {
        this.refill();
        
        if (this.tokens > 0) {
            this.tokens--;
            return Promise.resolve();
        }
        
        // Queue the request
        if (this.queue.length >= this.maxQueueSize) {
            throw new RamenError(
                'Rate limit queue full',
                ErrorCategory.UNKNOWN,
                ErrorSeverity.WARNING
            );
        }
        
        return new Promise<void>((resolve) => {
            this.queue.push(resolve);
        });
    }
    
    private refill(): void {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        const tokensToAdd = Math.floor(elapsed * this.refillRate);
        
        if (tokensToAdd > 0) {
            this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
            this.lastRefill = now;
            
            // Process queued requests
            while (this.tokens > 0 && this.queue.length > 0) {
                const resolve = this.queue.shift()!;
                this.tokens--;
                resolve();
            }
        }
    }
    
    get availableTokens(): number {
        this.refill();
        return this.tokens;
    }
    
    get queueSize(): number {
        return this.queue.length;
    }
}

/**
 * Lazy value initialization
 */
export class Lazy<T> {
    private value?: T;
    private initialized = false;
    
    constructor(private initializer: () => T) {}
    
    get(): T {
        if (!this.initialized) {
            this.value = this.initializer();
            this.initialized = true;
        }
        return this.value!;
    }
    
    isInitialized(): boolean {
        return this.initialized;
    }
    
    reset(): void {
        this.value = undefined;
        this.initialized = false;
    }
}

/**
 * Performance monitor
 */
export class PerformanceMonitor {
    private metrics = new Map<string, number[]>();
    private maxSamples = 100;
    
    start(name: string): () => void {
        const startTime = performance.now();
        
        return () => {
            const duration = performance.now() - startTime;
            this.record(name, duration);
        };
    }
    
    async measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
        const startTime = performance.now();
        
        try {
            const result = await operation();
            const duration = performance.now() - startTime;
            this.record(name, duration);
            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            this.record(name, duration);
            throw error;
        }
    }
    
    private record(name: string, duration: number): void {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        
        const samples = this.metrics.get(name)!;
        samples.push(duration);
        
        // Limit samples
        if (samples.length > this.maxSamples) {
            samples.shift();
        }
    }
    
    getStats(name: string): {
        count: number;
        min: number;
        max: number;
        avg: number;
        median: number;
        p95: number;
    } | null {
        const samples = this.metrics.get(name);
        
        if (!samples || samples.length === 0) {
            return null;
        }
        
        const sorted = [...samples].sort((a, b) => a - b);
        const count = sorted.length;
        const min = sorted[0];
        const max = sorted[count - 1];
        const avg = sorted.reduce((a, b) => a + b, 0) / count;
        const median = sorted[Math.floor(count / 2)];
        const p95 = sorted[Math.floor(count * 0.95)];
        
        return { count, min, max, avg, median, p95 };
    }
    
    getAllStats(): Map<string, ReturnType<typeof this.getStats>> {
        const allStats = new Map<string, ReturnType<typeof this.getStats>>();
        
        for (const [name] of this.metrics) {
            allStats.set(name, this.getStats(name));
        }
        
        return allStats;
    }
    
    clear(name?: string): void {
        if (name) {
            this.metrics.delete(name);
        } else {
            this.metrics.clear();
        }
    }
}

// Export singleton performance monitor
export const performanceMonitor = new PerformanceMonitor();