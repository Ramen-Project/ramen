export interface PerformanceConfig {
  enabled: boolean;
  slowThreshold: number; // ms
  sampleRate: number; // 0-1
  maxHistorySize: number;
  warnOnSlowDrag: boolean;
  warnOnLowFPS: boolean;
  fpsThreshold: number;
  memoryWarningThreshold: number; // MB
}

export interface PerformanceAlert {
  type: 'warning' | 'error';
  message: string;
  timestamp: number;
  operation?: string;
  duration?: number;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enabled: process.env.NODE_ENV === 'development',
  slowThreshold: 16, // 60fps budget
  sampleRate: 1.0,
  maxHistorySize: 100,
  warnOnSlowDrag: true,
  warnOnLowFPS: true,
  fpsThreshold: 30,
  memoryWarningThreshold: 100 // 100MB
};