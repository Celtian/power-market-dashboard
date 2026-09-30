import type { ConnectedPosition } from '@angular/cdk/overlay';

export type TooltipArrowPlacement =
  | 'top'
  | 'topLeft'
  | 'topRight'
  | 'right'
  | 'bottom'
  | 'bottomLeft'
  | 'bottomRight'
  | 'left';

export type OverlayPosition =
  | 'topRight'
  | 'topLeft'
  | 'topCenter'
  | 'bottomRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'right'
  | 'left';

export const createConnectedPositions = (
  offset = 5,
): Record<OverlayPosition, ConnectedPosition> => {
  return {
    topRight: {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'bottom',
      offsetY: -1 * offset,
    },
    topLeft: {
      originX: 'end',
      originY: 'top',
      overlayX: 'end',
      overlayY: 'bottom',
      offsetY: -1 * offset,
    },
    topCenter: {
      originX: 'center',
      originY: 'top',
      overlayX: 'center',
      overlayY: 'bottom',
      offsetY: -1 * offset,
    },
    bottomRight: {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
      offsetY: offset,
    },
    bottomLeft: {
      originX: 'end',
      originY: 'bottom',
      overlayX: 'end',
      overlayY: 'top',
      offsetY: offset,
    },
    bottomCenter: {
      originX: 'center',
      originY: 'bottom',
      overlayX: 'center',
      overlayY: 'top',
      offsetY: offset,
    },
    right: {
      originX: 'end',
      originY: 'center',
      overlayX: 'start',
      overlayY: 'center',
      offsetX: offset,
    },
    left: {
      originX: 'start',
      originY: 'center',
      overlayX: 'end',
      overlayY: 'center',
      offsetX: -1 * offset,
    },
  };
};

export const createSelectedPositions = (
  positions: readonly OverlayPosition[],
  offset = 5,
): ConnectedPosition[] => {
  const connectedPositions = createConnectedPositions(offset);
  return positions.map((position) => connectedPositions[position]);
};

export const getTooltipArrowPlacement = (
  position: ConnectedPosition,
): TooltipArrowPlacement => {
  if (position.overlayY === 'bottom') {
    return getAlignedArrowPlacement('bottom', position);
  }
  if (position.overlayY === 'top') {
    return getAlignedArrowPlacement('top', position);
  }
  return position.overlayX === 'start' ? 'left' : 'right';
};

const getAlignedArrowPlacement = (
  side: 'top' | 'bottom',
  position: ConnectedPosition,
): TooltipArrowPlacement => {
  if (position.overlayX === 'start') {
    return `${side}Left`;
  }
  if (position.overlayX === 'end') {
    return `${side}Right`;
  }
  return side;
};
