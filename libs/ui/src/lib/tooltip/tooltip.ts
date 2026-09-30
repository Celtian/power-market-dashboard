import { FocusMonitor, FocusOrigin } from '@angular/cdk/a11y';
import {
  FlexibleConnectedPositionStrategy,
  Overlay,
  OverlayPositionBuilder,
  OverlayRef,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  ComponentRef,
  Directive,
  ElementRef,
  OnDestroy,
  PendingTasks,
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
  createSelectedPositions,
  getTooltipArrowPlacement,
} from '../helpers/overlay';
import { TooltipContent, TooltipTarget } from './tooltip-content';
import { TOOLTIP_CONFIG } from './tooltip.provider';

let nextTooltipId = 0;

@Directive({
  selector: '[uiTooltip]',
  host: {
    '(click)': 'handleClick()',
    '(keydown.escape)': 'handleEscape()',
    '(mouseenter)': 'handleMouseEnter()',
    '(mouseleave)': 'handleMouseLeave()',
    '[attr.aria-describedby]': 'describedBy()',
  },
})
export class Tooltip implements OnDestroy {
  public readonly target = input.required<TooltipTarget>({
    alias: 'uiTooltip',
  });
  public readonly tooltipPosition = input.required<readonly OverlayPosition[]>();
  public readonly tooltipPadding = input(true);

  private readonly overlayPositionBuilder = inject(OverlayPositionBuilder);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly overlay = inject(Overlay);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly tooltipConfig = inject(TOOLTIP_CONFIG);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly tooltipId = `ui-tooltip-${nextTooltipId++}`;
  private readonly existingDescribedBy =
    this.elementRef.nativeElement.getAttribute('aria-describedby');

  public readonly describedBy = computed(() => {
    const tooltipId = this.visible() ? this.tooltipId : undefined;
    return [this.existingDescribedBy, tooltipId].filter(Boolean).join(' ') || undefined;
  });

  private overlayRef?: OverlayRef;
  private tooltipRef?: ComponentRef<TooltipContent>;
  private positionSubscription?: Subscription;
  private detachmentsSubscription?: Subscription;
  private readonly focusSubscription: Subscription;
  private readonly visible = signal(false);
  private destroyed = false;
  private focused = false;
  private hovered = false;

  constructor() {
    this.focusSubscription = this.focusMonitor
      .monitor(this.elementRef)
      .subscribe((origin) => this.scheduleFocusChange(origin));

    effect(() => {
      const target = this.target();
      const positions = this.tooltipPosition();
      if (!target) {
        this.dismiss();
        return;
      }

      this.overlayRef?.updatePositionStrategy(this.positionStrategy(positions));
      this.tooltipRef?.setInput('content', target);
    });
  }

  public show(): void {
    const target = this.target();
    if (!target || this.overlayRef) {
      return;
    }

    const positions = this.tooltipPosition();
    const positionStrategy = this.positionStrategy(positions);
    const overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.close(),
    });
    this.overlayRef = overlayRef;

    const tooltipRef = overlayRef.attach(
      new ComponentPortal(TooltipContent, this.viewContainerRef),
    );
    this.tooltipRef = tooltipRef;
    tooltipRef.setInput('content', target);
    tooltipRef.setInput('arrow', this.tooltipConfig.arrow);
    tooltipRef.setInput('padding', this.tooltipPadding());
    tooltipRef.setInput('elementId', this.tooltipId);
    tooltipRef.setInput('maxWidth', this.tooltipConfig.maxWidth);
    const initialPosition = createSelectedPositions(positions)[0];
    if (initialPosition) {
      tooltipRef.setInput('arrowPlacement', getTooltipArrowPlacement(initialPosition));
    }

    this.positionSubscription = positionStrategy.positionChanges.subscribe(({ connectionPair }) => {
      tooltipRef.setInput('arrowPlacement', getTooltipArrowPlacement(connectionPair));
    });
    this.detachmentsSubscription = overlayRef.detachments().subscribe(() => {
      this.handleOverlayDetachment(overlayRef);
    });
    this.visible.set(true);
  }

  public hide(): void {
    this.dismiss();
  }

  public handleClick(): void {
    this.dismiss();
  }

  public handleEscape(): void {
    this.dismiss();
  }

  public handleMouseEnter(): void {
    this.hovered = true;
    this.show();
  }

  public handleMouseLeave(): void {
    this.hovered = false;
    if (!this.focused) {
      this.disposeOverlay();
    }
  }

  public ngOnDestroy(): void {
    this.destroyed = true;
    this.focusSubscription.unsubscribe();
    this.focusMonitor.stopMonitoring(this.elementRef);
    this.dismiss();
  }

  private positionStrategy(
    positions: readonly OverlayPosition[],
  ): FlexibleConnectedPositionStrategy {
    return this.overlayPositionBuilder
      .flexibleConnectedTo(this.elementRef)
      .withPositions(createSelectedPositions(positions));
  }

  private handleFocusChange(origin: FocusOrigin): void {
    this.focused = origin === 'keyboard';
    if (this.focused) {
      this.show();
      return;
    }
    if (!this.hovered) {
      this.disposeOverlay();
    }
  }

  private scheduleFocusChange(origin: FocusOrigin): void {
    this.pendingTasks.run(async () => {
      await Promise.resolve();
      if (!this.destroyed) {
        this.handleFocusChange(origin);
      }
    });
  }

  private dismiss(): void {
    this.focused = false;
    this.hovered = false;
    this.disposeOverlay();
  }

  private disposeOverlay(): void {
    const overlayRef = this.overlayRef;
    this.overlayRef = undefined;
    this.tooltipRef = undefined;
    this.positionSubscription?.unsubscribe();
    this.positionSubscription = undefined;
    this.detachmentsSubscription?.unsubscribe();
    this.detachmentsSubscription = undefined;
    this.visible.set(false);
    overlayRef?.dispose();
  }

  private handleOverlayDetachment(overlayRef: OverlayRef): void {
    if (this.overlayRef !== overlayRef) {
      return;
    }
    this.disposeOverlay();
  }
}
