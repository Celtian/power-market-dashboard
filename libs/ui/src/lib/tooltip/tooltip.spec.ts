import { FocusMonitor, FocusOrigin } from '@angular/cdk/a11y';
import { OverlayContainer, OverlayRef } from '@angular/cdk/overlay';
import {
  Component,
  InjectionToken,
  OnDestroy,
  TemplateRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { OverlayPosition } from '../helpers/overlay';
import { Tooltip } from './tooltip';
import { TooltipTarget } from './tooltip-content';
import { provideTooltip } from './tooltip.provider';

const TOOLTIP_TEST_CONTEXT = new InjectionToken<string>('TOOLTIP_TEST_CONTEXT');
const tooltipComponentDestroyed = vi.fn();

@Component({
  selector: 'ui-tooltip-test-content',
  template: `<span data-testid="dynamic-tooltip"
    >{{ context }}:{{ label() }}</span
  >`,
})
class DynamicTooltip implements OnDestroy {
  public readonly context = inject(TOOLTIP_TEST_CONTEXT);
  public readonly label = input('direct');

  public ngOnDestroy(): void {
    tooltipComponentDestroyed();
  }
}

@Component({
  selector: 'ui-tooltip-test-blur-content',
  template: `{{ blurActiveElement() }}`,
})
class BlurDuringRenderTooltip {
  public blurActiveElement(): string {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    return 'Blurred';
  }
}

@Component({
  selector: 'ui-tooltip-test-host',
  imports: [Tooltip],
  template: `
    <button
      aria-describedby="existing-description"
      type="button"
      [tooltipPosition]="positions()"
      [uiTooltip]="content()"
    >
      Trigger
    </button>
    <ng-template #template><strong>Template tooltip</strong></ng-template>
  `,
  providers: [{ provide: TOOLTIP_TEST_CONTEXT, useValue: 'scoped' }],
})
class TooltipTestHost {
  public readonly content = signal<TooltipTarget>('Tooltip text');
  public readonly positions = signal<readonly OverlayPosition[]>([
    'bottomCenter',
    'topCenter',
  ]);
  public readonly template = viewChild.required<TemplateRef<void>>('template');
}

@Component({
  selector: 'ui-tooltip-test-plain-host',
  imports: [Tooltip],
  template: `
    <span
      data-plain-tooltip
      [tooltipPosition]="positions"
      [uiTooltip]="content"
    >
      Plain content
    </span>
  `,
})
class PlainTooltipTestHost {
  public readonly content: TooltipTarget = 'Tooltip text';
  public readonly positions: readonly OverlayPosition[] = [
    'bottomCenter',
    'topCenter',
  ];
}

interface TestContext {
  button: HTMLButtonElement;
  fixture: ReturnType<typeof TestBed.createComponent<TooltipTestHost>>;
  focusMonitor: FocusMonitor;
  overlayContainer: HTMLElement;
  tooltip: Tooltip;
}

const setup = async (arrow = true): Promise<TestContext> => {
  TestBed.configureTestingModule({
    providers: [provideTooltip({ arrow, maxWidth: '10rem' })],
  });
  const fixture = TestBed.createComponent(TooltipTestHost);
  await fixture.whenStable();

  return {
    button: fixture.nativeElement.querySelector('button') as HTMLButtonElement,
    fixture,
    focusMonitor: TestBed.inject(FocusMonitor),
    overlayContainer: TestBed.inject(OverlayContainer).getContainerElement(),
    tooltip: fixture.debugElement
      .query(By.directive(Tooltip))
      .injector.get(Tooltip),
  };
};

const dispatch = async (context: TestContext, event: Event): Promise<void> => {
  context.button.dispatchEvent(event);
  await context.fixture.whenStable();
};

const focusVia = async (
  context: TestContext,
  origin: FocusOrigin,
): Promise<void> => {
  context.focusMonitor.focusVia(context.button, origin);
  await context.fixture.whenStable();
};

describe('Tooltip', () => {
  beforeEach(() => {
    tooltipComponentDestroyed.mockClear();
  });

  it('does not make plain tooltip content keyboard focusable', async () => {
    TestBed.configureTestingModule({
      providers: [provideTooltip({ maxWidth: '10rem' })],
    });
    const fixture = TestBed.createComponent(PlainTooltipTestHost);
    await fixture.whenStable();
    const plainText = fixture.nativeElement.querySelector(
      '[data-plain-tooltip]',
    ) as HTMLElement;
    const overlayContainer =
      TestBed.inject(OverlayContainer).getContainerElement();

    plainText.dispatchEvent(new MouseEvent('mouseenter'));
    await fixture.whenStable();

    expect(plainText.tabIndex).toBe(-1);
    expect(
      overlayContainer.querySelector('ui-tooltip-content')?.textContent,
    ).toContain('Tooltip text');
  });

  it('responds to keyboard, programmatic, and mouse focus while preserving hover state', async () => {
    const context = await setup();

    await focusVia(context, 'program');
    expect(
      context.overlayContainer.querySelector('ui-tooltip-content'),
    ).toBeNull();
    expect(context.button.getAttribute('aria-describedby')).toBe(
      'existing-description',
    );

    context.button.blur();
    await context.fixture.whenStable();
    await focusVia(context, 'keyboard');
    expect(
      context.overlayContainer.querySelector('ui-tooltip-content'),
    ).not.toBeNull();

    await dispatch(context, new MouseEvent('mouseenter'));
    await dispatch(context, new MouseEvent('mouseleave'));
    expect(
      context.overlayContainer.querySelector('ui-tooltip-content'),
    ).not.toBeNull();

    context.button.blur();
    await context.fixture.whenStable();
    expect(
      context.overlayContainer.querySelector('ui-tooltip-content'),
    ).toBeNull();
    expect(context.button.getAttribute('aria-describedby')).toBe(
      'existing-description',
    );

    await dispatch(context, new MouseEvent('mouseenter'));
    await focusVia(context, 'mouse');
    expect(
      context.overlayContainer.querySelector('ui-tooltip-content'),
    ).not.toBeNull();

    await dispatch(context, new MouseEvent('mouseleave'));
    expect(
      context.overlayContainer.querySelector('ui-tooltip-content'),
    ).toBeNull();
  });

  it('handles focus loss triggered while tooltip content renders', async () => {
    const context = await setup();
    context.fixture.componentInstance.content.set(BlurDuringRenderTooltip);
    await context.fixture.whenStable();

    await focusVia(context, 'keyboard');

    expect(
      context.overlayContainer.querySelector('ui-tooltip-content'),
    ).toBeNull();
    expect(context.button.getAttribute('aria-describedby')).toBe(
      'existing-description',
    );
  });

  it('dismisses the tooltip on click and Escape', async () => {
    const context = await setup();

    await focusVia(context, 'keyboard');
    await dispatch(context, new MouseEvent('click'));
    expect(
      context.overlayContainer.querySelector('ui-tooltip-content'),
    ).toBeNull();

    context.button.blur();
    await context.fixture.whenStable();
    await focusVia(context, 'keyboard');
    await dispatch(context, new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(
      context.overlayContainer.querySelector('ui-tooltip-content'),
    ).toBeNull();
  });

  it('shows one configured tooltip and switches reactively between every content type', async () => {
    const context = await setup();
    await dispatch(context, new MouseEvent('mouseenter'));
    await dispatch(context, new MouseEvent('mouseenter'));

    const contents =
      context.overlayContainer.querySelectorAll('ui-tooltip-content');
    const tooltipContent = contents.item(0) as HTMLElement;
    expect(contents).toHaveLength(1);
    expect(tooltipContent.textContent).toContain('Tooltip text');
    expect(tooltipContent.style.maxWidth).toBe('10rem');
    expect(tooltipContent.classList).toContain('after:absolute');
    expect(context.button.getAttribute('aria-describedby')).toBe(
      `existing-description ${tooltipContent.id}`,
    );

    context.fixture.componentInstance.content.set(
      context.fixture.componentInstance.template(),
    );
    await context.fixture.whenStable();
    expect(tooltipContent.querySelector('strong')?.textContent).toBe(
      'Template tooltip',
    );
    expect(tooltipContent.style.maxWidth).toBe('');

    context.fixture.componentInstance.content.set(DynamicTooltip);
    await context.fixture.whenStable();
    expect(
      tooltipContent.querySelector('[data-testid="dynamic-tooltip"]')
        ?.textContent,
    ).toBe('scoped:direct');
    expect(tooltipContent.style.maxWidth).toBe('');

    context.fixture.componentInstance.content.set({
      component: DynamicTooltip,
      inputs: { label: 'updated' },
    });
    await context.fixture.whenStable();
    expect(
      tooltipContent.querySelector('[data-testid="dynamic-tooltip"]')
        ?.textContent,
    ).toBe('scoped:updated');

    context.fixture.componentInstance.content.set('Text again');
    await context.fixture.whenStable();
    expect(tooltipContent.textContent).toContain('Text again');
    expect(tooltipComponentDestroyed).toHaveBeenCalledOnce();

    context.fixture.componentInstance.content.set(DynamicTooltip);
    await context.fixture.whenStable();
    await dispatch(context, new MouseEvent('mouseleave'));
    expect(tooltipComponentDestroyed).toHaveBeenCalledTimes(2);
  });

  it('reacts to empty content and position changes and cleans up its overlay', async () => {
    const context = await setup();
    context.fixture.componentInstance.content.set('');
    await context.fixture.whenStable();

    await dispatch(context, new MouseEvent('mouseenter'));
    expect(
      context.overlayContainer.querySelector('ui-tooltip-content'),
    ).toBeNull();

    context.fixture.componentInstance.content.set('Visible');
    await context.fixture.whenStable();
    await dispatch(context, new MouseEvent('mouseenter'));
    context.fixture.componentInstance.content.set('');
    await context.fixture.whenStable();
    expect(
      context.overlayContainer.querySelector('ui-tooltip-content'),
    ).toBeNull();

    context.fixture.componentInstance.content.set('Visible');
    await context.fixture.whenStable();
    await dispatch(context, new MouseEvent('mouseenter'));
    const overlayRef = context.tooltip['overlayRef'] as OverlayRef;
    const updatePositionStrategy = vi.spyOn(
      overlayRef,
      'updatePositionStrategy',
    );

    context.fixture.componentInstance.positions.set(['left', 'right']);
    await context.fixture.whenStable();

    expect(updatePositionStrategy).toHaveBeenCalledOnce();
    expect(
      context.overlayContainer.querySelectorAll('ui-tooltip-content'),
    ).toHaveLength(1);

    context.tooltip['overlayRef']?.detach();
    await context.fixture.whenStable();
    expect(
      context.overlayContainer.querySelector('ui-tooltip-content'),
    ).toBeNull();
    expect(context.button.getAttribute('aria-describedby')).toBe(
      'existing-description',
    );

    await dispatch(context, new MouseEvent('mouseenter'));
    context.fixture.destroy();
    expect(
      context.overlayContainer.querySelector('ui-tooltip-content'),
    ).toBeNull();
  });

  it('honors disabled arrows from the tooltip provider', async () => {
    const context = await setup(false);

    await dispatch(context, new MouseEvent('mouseenter'));

    const content = context.overlayContainer.querySelector(
      'ui-tooltip-content',
    ) as HTMLElement;
    expect(content.classList).not.toContain('after:absolute');
  });
});
