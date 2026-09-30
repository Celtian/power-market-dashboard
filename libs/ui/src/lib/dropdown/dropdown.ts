import {
  FlexibleConnectedPositionStrategy,
  Overlay,
  OverlayPositionBuilder,
  OverlayRef,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  Directive,
  ElementRef,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { Subscription } from 'rxjs';

import {
  OverlayPosition,
  TooltipArrowPlacement,
  createSelectedPositions,
  getTooltipArrowPlacement,
} from '../helpers/overlay';

@Directive({
  selector: 'button[uiDropdown]',
  host: {
    '(click)': 'toggle()',
    '(keydown.escape)': 'handleEscape($event)',
    '[attr.aria-controls]': 'dropdownControls()',
    '[attr.aria-expanded]': 'ariaExpanded()',
  },
  exportAs: 'uiDropdown',
})
export class Dropdown implements OnDestroy {
  public readonly content = input.required<TemplateRef<void>>({
    alias: 'uiDropdown',
  });
  public readonly dropdownControls = input.required<string>();
  public readonly dropdownKeepOpenFor = input<readonly Element[]>([]);
  public readonly dropdownPosition = input.required<readonly OverlayPosition[]>();
  public readonly isOpen = signal(false);
  public readonly ariaExpanded = computed(() => String(this.isOpen()));

  private readonly elementRef = inject<ElementRef<HTMLButtonElement>>(ElementRef);
  private readonly overlay = inject(Overlay);
  private readonly overlayPositionBuilder = inject(OverlayPositionBuilder);
  private readonly viewContainerRef = inject(ViewContainerRef);

  private arrowPlacement?: TooltipArrowPlacement;
  private overlayRef?: OverlayRef;
  private overlaySubscriptions = new Subscription();
  private positionSubscription?: Subscription;

  public constructor() {
    effect(() => {
      const positions = this.dropdownPosition();
      if (this.overlayRef) {
        this.updatePositionStrategy(positions);
      }
    });
  }

  public open(): void {
    if (this.isOpen()) {
      return;
    }

    const positions = this.dropdownPosition();
    const positionStrategy = this.positionStrategy(positions);
    const overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.close(),
    });
    this.overlayRef = overlayRef;
    this.observePosition(positionStrategy, positions);
    overlayRef.attach(new TemplatePortal(this.content(), this.viewContainerRef));
    this.applyArrowPlacement();

    this.overlaySubscriptions.add(
      overlayRef.outsidePointerEvents().subscribe((event) => {
        if (!this.isKeepOpenTarget(event.target)) {
          this.close();
        }
      }),
    );
    this.overlaySubscriptions.add(
      overlayRef.keydownEvents().subscribe((event) => {
        if (event.key === 'Escape') {
          this.handleEscape(event);
        }
      }),
    );
    this.overlaySubscriptions.add(overlayRef.detachments().subscribe(() => this.disposeOverlay()));
    this.isOpen.set(true);
  }

  public close(): void {
    this.disposeOverlay();
  }

  public toggle(): void {
    if (this.isOpen()) {
      this.close();
      return;
    }

    this.open();
  }

  public handleEscape(event: Event): void {
    if (!this.isOpen()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.close();
    this.elementRef.nativeElement.focus();
  }

  public ngOnDestroy(): void {
    this.close();
  }

  private disposeOverlay(): void {
    const overlayRef = this.overlayRef;
    this.overlayRef = undefined;
    this.positionSubscription?.unsubscribe();
    this.positionSubscription = undefined;
    this.overlaySubscriptions.unsubscribe();
    this.overlaySubscriptions = new Subscription();
    this.arrowPlacement = undefined;
    this.isOpen.set(false);
    overlayRef?.dispose();
  }

  private positionStrategy(
    positions: readonly OverlayPosition[],
  ): FlexibleConnectedPositionStrategy {
    return this.overlayPositionBuilder
      .flexibleConnectedTo(this.elementRef)
      .withPositions(createSelectedPositions(positions));
  }

  private updatePositionStrategy(positions: readonly OverlayPosition[]): void {
    const positionStrategy = this.positionStrategy(positions);
    this.observePosition(positionStrategy, positions);
    this.overlayRef?.updatePositionStrategy(positionStrategy);
  }

  private observePosition(
    positionStrategy: FlexibleConnectedPositionStrategy,
    positions: readonly OverlayPosition[],
  ): void {
    this.positionSubscription?.unsubscribe();
    const [initialPosition] = createSelectedPositions(positions);
    if (initialPosition) {
      this.setArrowPlacement(getTooltipArrowPlacement(initialPosition));
    }
    this.positionSubscription = positionStrategy.positionChanges.subscribe(({ connectionPair }) => {
      this.setArrowPlacement(getTooltipArrowPlacement(connectionPair));
    });
  }

  private setArrowPlacement(placement: TooltipArrowPlacement): void {
    this.arrowPlacement = placement;
    this.applyArrowPlacement();
  }

  private applyArrowPlacement(): void {
    if (!this.arrowPlacement) {
      return;
    }

    const panel =
      this.overlayRef?.overlayElement.querySelector<HTMLElement>('[data-dropdown-panel]');
    panel?.setAttribute('data-dropdown-arrow-placement', this.arrowPlacement);
  }

  private isKeepOpenTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Node)) {
      return false;
    }

    const trigger = this.elementRef.nativeElement;
    return [trigger, ...this.dropdownKeepOpenFor()].some(
      (element) => target === element || element.contains(target),
    );
  }
}
