import { buttonIconStyles, buttonStyles } from './button.styles';

const styleFactories = [
  ['button', buttonStyles],
  ['icon button', buttonIconStyles],
] as const;

const radiusClasses = [
  ['none', undefined],
  ['all', 'rounded-lg'],
  ['start', 'rounded-s-lg'],
  ['end', 'rounded-e-lg'],
] as const;

describe.each(styleFactories)('%s styles', (_name, styles) => {
  it.each(radiusClasses)('maps the %s radius to its logical class', (rounded, expectedClass) => {
    const classes = styles({ rounded }).split(' ');

    if (expectedClass) {
      expect(classes).toContain(expectedClass);
    } else {
      expect(classes.some((className) => className.startsWith('rounded-'))).toBe(false);
    }
  });

  it('keeps border styling independent from corner rounding', () => {
    const classes = styles({ withBorder: true, rounded: 'none' }).split(' ');

    expect(classes).toContain('border');
    expect(classes).toContain('border-primary-400');
    expect(classes.some((className) => className.startsWith('rounded-'))).toBe(false);
  });

  it('defaults to neither a border nor rounded corners', () => {
    const classes = styles().split(' ');

    expect(classes).not.toContain('border');
    expect(classes.some((className) => className.startsWith('rounded-'))).toBe(false);
  });

  it('provides a destructive danger variant', () => {
    const classes = styles({ color: 'danger' }).split(' ');

    expect(classes).toContain('bg-danger-600');
    expect(classes).toContain('text-danger-contrast-600');
  });

  it('visually distinguishes disabled controls and prevents interaction', () => {
    const classes = styles({ disabled: true }).split(' ');

    expect(classes).toContain('cursor-not-allowed');
    expect(classes).toContain('opacity-50');
    expect(classes).toContain('pointer-events-none');
  });
});

describe('button styles', () => {
  it('aligns button content with a consistent icon gap', () => {
    const classes = buttonStyles().split(' ');

    expect(classes).toContain('inline-flex');
    expect(classes).toContain('items-center');
    expect(classes).toContain('justify-center');
    expect(classes).toContain('gap-2');
  });
});
