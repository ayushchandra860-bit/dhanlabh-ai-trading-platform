export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowState {
  isFound: boolean;
  isFocused: boolean;
  position?: WindowPosition;
  size?: WindowSize;
  /** Name of the detected broker, e.g. 'OlympTrade'. Null when no broker detected. */
  brokerName?: string | null;
  /** Display DPI scale factor (e.g. 1, 1.25, 1.5) */
  scaleFactor?: number;
}