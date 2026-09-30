import {
  FlexibleConnectedPositionStrategy,
  Overlay,
  OverlayContainer,
  OverlayPositionBuilder,
} from '@angular/cdk/overlay';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Subject } from 'rxjs';

import { createConnectedPositions, createSelectedPositions } from '../helpers/overlay';
import { Dropdown } from './dropdown';
import { DropdownPanel } from './dropdown-panel';

@Component({
  imports: [Dropdown, DropdownPanel],
  template: `
    <div #keepOpenBoundary data-keep-open-boundary>
      <button type="button"><span data-keep-open-child>Keep open</span></button>
    </div>
    <button
      #dropdown="uiDropdown"
      type="button"
      data-dropdown-trigger
      dropdownControls="test-dropdown-panel"
      [uiDropdown]="dropdownContent"
      [dropdownKeepOpenFor]="[keepOpenBoundary]"
      [dropdownPosition]="positions()"
    >
      Show details
    </button>
    <button type="button" data-outside-trigger>Outside</button>

    <ng-template #dropdownContent>
      <section id="test-dropdown-panel" uiDropdownPanel aria-labelledby="test-dropdown-heading">
        <h2 id="test-dropdown-heading">Details</h2>
        <button type="button" data-panel-action>Panel action</button>
      </section>
    </ng-template>
  `,
})
class TestDropdown {
  public readonly positions = signal<readonly ('bottomLeft' | 'topLeft' | 'right' | 'left')[]>([
    'bottomLeft',
    'topLeft',
  ]);
}

describe('Dropdown', () => {
  let fixture: ComponentFixture<TestDropdown>;
  let overlayContainer: HTMLElement;
  let positionChanges: Subject<{
    connectionPair: ReturnType<typeof createConnectedPositions>['bottomLeft'];
  }>;
  let withPositions: ReturnType<typeof vi.fn>;

  const requiredElement = <T extends Element>(container: ParentNode, selector: string): T => {
    const element = container.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Expected element matching ${selector}`);
    }
    return element;
  };
  const trigger = (): HTMLButtonElement =>
    requiredElement<HTMLButtonElement>(
      fixture.nativeElement as HTMLElement,
      '[data-dropdown-trigger]',
    );
  const outsideTrigger = (): HTMLButtonElement =>
    requiredElement<HTMLButtonElement>(
      fixture.nativeElement as HTMLElement,
      '[data-outside-trigger]',
    );
  const keepOpenChild = (): HTMLElement =>
    requiredElement<HTMLElement>(fixture.nativeElement as HTMLElement, '[data-keep-open-child]');
  const panel = (): HTMLElement | null => overlayContainer.querySelector('#test-dropdown-panel');

  beforeEach(async () => {
    withPositions = vi.fn();
    const createPositionStrategy = (): FlexibleConnectedPositionStrategy => {
      positionChanges = new Subject();
      const positionStrategy = {
        apply: vi.fn(),
        attach: vi.fn(),
        detach: vi.fn(),
        dispose: vi.fn(),
        positionChanges,
        withPositions,
      } as unknown as FlexibleConnectedPositionStrategy;
      withPositions.mockReturnValue(positionStrategy);
      return positionStrategy;
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OverlayPositionBuilder,
          useValue: { flexibleConnectedTo: createPositionStrategy },
        },
      ],
    });
    fixture = TestBed.createComponent(TestDropdown);
    overlayContainer = TestBed.inject(OverlayContainer).getContainerElement();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    overlayContainer.replaceChildren();
  });

  it('exposes disclosure semantics and uses the requested fallback positions', async () => {
    expect(trigger().getAttribute('aria-controls')).toBe('test-dropdown-panel');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    trigger().click();
    await fixture.whenStable();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(panel()?.textContent).toContain('Details');
    expect(panel()?.dataset['dropdownArrowPlacement']).toBe('topRight');
    expect(withPositions).toHaveBeenCalledWith(createSelectedPositions(['bottomLeft', 'topLeft']));
  });

  it('moves the arrow when CDK selects a fallback position', async () => {
    trigger().click();
    await fixture.whenStable();

    positionChanges.next({
      connectionPair: createConnectedPositions().topLeft,
    });
    await fixture.whenStable();

    expect(panel()?.dataset['dropdownArrowPlacement']).toBe('bottomRight');
  });

  it('rebinds arrow tracking when the requested positions change', async () => {
    trigger().click();
    await fixture.whenStable();
    const originalPositionChanges = positionChanges;

    fixture.componentInstance.positions.set(['right', 'left']);
    await fixture.whenStable();

    expect(panel()?.dataset['dropdownArrowPlacement']).toBe('left');

    originalPositionChanges.next({
      connectionPair: createConnectedPositions().topLeft,
    });
    positionChanges.next({ connectionPair: createConnectedPositions().left });
    await fixture.whenStable();

    expect(panel()?.dataset['dropdownArrowPlacement']).toBe('right');
  });

  it('opens only from activation, toggles closed, and stays open for panel interactions', async () => {
    trigger().dispatchEvent(new MouseEvent('mouseenter'));
    trigger().dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(panel()).toBeNull();

    trigger().click();
    await fixture.whenStable();
    requiredElement<HTMLButtonElement>(overlayContainer, '[data-panel-action]').click();
    await fixture.whenStable();
    expect(panel()).not.toBeNull();

    trigger().click();
    await fixture.whenStable();
    expect(panel()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('closes from an outside pointer interaction but honors keep-open boundaries', async () => {
    trigger().click();
    await fixture.whenStable();

    keepOpenChild().click();
    await fixture.whenStable();
    expect(panel()).not.toBeNull();

    outsideTrigger().click();
    await fixture.whenStable();
    expect(panel()).toBeNull();
  });

  it('closes on Escape from the panel and restores focus to the trigger', async () => {
    trigger().click();
    await fixture.whenStable();
    const panelAction = requiredElement<HTMLButtonElement>(overlayContainer, '[data-panel-action]');
    panelAction.focus();

    panelAction.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    await fixture.whenStable();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('closes on Escape from the trigger', async () => {
    trigger().click();
    await fixture.whenStable();

    trigger().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    await fixture.whenStable();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('uses the closing scroll strategy and disposes with its trigger', async () => {
    const overlay = TestBed.inject(Overlay);
    const close = vi.spyOn(overlay.scrollStrategies, 'close');
    trigger().click();
    await fixture.whenStable();

    expect(close).toHaveBeenCalledOnce();
    expect(panel()).not.toBeNull();

    fixture.debugElement.query(By.directive(Dropdown)).injector.get(Dropdown).ngOnDestroy();
    expect(panel()).toBeNull();
  });
});
