import {
  OverlayPosition,
  TooltipArrowPlacement,
  createConnectedPositions,
  createSelectedPositions,
  getTooltipArrowPlacement,
} from './overlay';

describe('overlay helpers', () => {
  it.each<[OverlayPosition, TooltipArrowPlacement]>([
    ['topRight', 'bottomLeft'],
    ['topLeft', 'bottomRight'],
    ['topCenter', 'bottom'],
    ['bottomRight', 'topLeft'],
    ['bottomLeft', 'topRight'],
    ['bottomCenter', 'top'],
    ['right', 'left'],
    ['left', 'right'],
  ])('maps %s to the %s arrow placement', (position, arrowPlacement) => {
    expect(getTooltipArrowPlacement(createConnectedPositions()[position])).toBe(arrowPlacement);
  });

  it('selects positions in the requested order with the requested offset', () => {
    const selected = createSelectedPositions(['left', 'bottomCenter', 'topRight'], 12);

    expect(selected).toEqual([
      expect.objectContaining({ offsetX: -12, overlayX: 'end' }),
      expect.objectContaining({ offsetY: 12, overlayY: 'top' }),
      expect.objectContaining({ offsetY: -12, overlayY: 'bottom' }),
    ]);
  });
});
