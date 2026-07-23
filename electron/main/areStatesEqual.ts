import { WindowState } from '../../shared/types/window';

export function areStatesEqual(a: WindowState, b: WindowState): boolean {
  // NOTE: isFocused intentionally excluded — focus changes do NOT affect overlay position/size
  if (a.isFound !== b.isFound) {
    return false;
  }

  if (!a.isFound && !b.isFound) {
    return true;
  }

  if (a.position?.x !== b.position?.x || a.position?.y !== b.position?.y) {
    return false;
  }

  if (a.size?.width !== b.size?.width || a.size?.height !== b.size?.height) {
    return false;
  }

  return true;
}