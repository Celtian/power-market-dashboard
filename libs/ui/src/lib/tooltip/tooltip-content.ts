import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, Type, computed, input } from '@angular/core';

import { cva } from 'class-variance-authority';

import type { TooltipArrowPlacement } from '../helpers/overlay';

export interface TooltipComponentTarget {
  component: Type<unknown>;
  inputs?: Record<string, unknown>;
}

export type TooltipTarget = string | TemplateRef<void> | Type<unknown> | TooltipComponentTarget;

const isTooltipComponentTarget = (target: TooltipTarget): target is TooltipComponentTarget => {
  return typeof target === 'object' && target !== null && 'component' in target;
};

const styles = cva(
  'relative block rounded-lg border border-primary-400 surface-200 text-xs shadow-lg dark:border-secondary-600 dark:surface-800',
  {
    variants: {
      arrow: {
        true: 'after:pointer-events-none after:absolute after:size-2 after:rotate-45 after:border-inherit after:bg-inherit',
        false: '',
      },
      arrowPlacement: {
        top: 'after:-top-1 after:left-1/2 after:-translate-x-1/2 after:border-l after:border-t',
        topLeft: 'after:-top-1 after:left-3 after:border-l after:border-t',
        topRight: 'after:-top-1 after:right-3 after:border-l after:border-t',
        right: 'after:top-1/2 after:-right-1 after:-translate-y-1/2 after:border-r after:border-t',
        bottom:
          'after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:border-r after:border-b',
        bottomLeft: 'after:-bottom-1 after:left-3 after:border-r after:border-b',
        bottomRight: 'after:right-3 after:-bottom-1 after:border-r after:border-b',
        left: 'after:top-1/2 after:-left-1 after:-translate-y-1/2 after:border-b after:border-l',
      } satisfies Record<TooltipArrowPlacement, string>,
      padding: {
        true: 'px-2 py-1',
      },
      text: {
        true: 'wrap-break-word whitespace-normal',
        false: '',
      },
    },
    defaultVariants: {
      arrow: false,
      padding: true,
      text: false,
    },
  },
);

@Component({
  selector: 'ui-tooltip-content',
  imports: [NgComponentOutlet, NgTemplateOutlet],
  templateUrl: './tooltip-content.html',
  host: {
    '[attr.id]': 'elementId()',
    '[class]': 'classes()',
    '[style.max-width]': 'maxWidthStyle()',
    role: 'tooltip',
  },
})
export class TooltipContent {
  public readonly content = input.required<TooltipTarget>();
  public readonly padding = input(true);
  public readonly arrow = input(false);
  public readonly arrowPlacement = input<TooltipArrowPlacement>('top');
  public readonly elementId = input.required<string>();
  public readonly maxWidth = input<number | string>();

  private readonly isText = computed(() => typeof this.content() === 'string');
  private readonly isTemplate = computed(() => this.content() instanceof TemplateRef);
  public readonly template = computed<TemplateRef<void> | undefined>(() => {
    return this.isTemplate() ? (this.content() as TemplateRef<void>) : undefined;
  });
  public readonly text = computed(() => {
    return this.isText() ? (this.content() as string) : '';
  });
  public readonly component = computed<Type<unknown> | undefined>(() => {
    const content = this.content();
    if (typeof content === 'function') {
      return content;
    }
    return isTooltipComponentTarget(content) ? content.component : undefined;
  });
  public readonly componentInputs = computed(() => {
    const content = this.content();
    return isTooltipComponentTarget(content) ? content.inputs : undefined;
  });
  public readonly maxWidthStyle = computed(() => {
    if (!this.isText()) {
      return undefined;
    }

    const maxWidth = this.maxWidth();
    return typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
  });
  public readonly classes = computed(() => {
    return styles({
      arrow: this.arrow(),
      arrowPlacement: this.arrow() ? this.arrowPlacement() : null,
      padding: this.padding(),
      text: this.isText(),
    });
  });
}
