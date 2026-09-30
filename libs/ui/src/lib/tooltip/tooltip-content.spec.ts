import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TooltipContent } from './tooltip-content';

@Component({
  imports: [TooltipContent],
  template: `
    <ng-template #contentTemplate
      ><strong>Template content</strong></ng-template
    >
    <ui-tooltip-content
      arrowPlacement="bottomRight"
      elementId="tooltip-test"
      [arrow]="true"
      [content]="contentTemplate"
      [maxWidth]="100"
    />
  `,
})
class TemplateHost {}

describe('TooltipContent', () => {
  it('renders accessible styled string content with a maximum width and arrow', async () => {
    const fixture = TestBed.createComponent(TooltipContent);
    fixture.componentRef.setInput('content', 'A tooltip that can wrap');
    fixture.componentRef.setInput('elementId', 'tooltip-test');
    fixture.componentRef.setInput('maxWidth', 160);
    fixture.componentRef.setInput('arrow', true);
    fixture.componentRef.setInput('arrowPlacement', 'topLeft');

    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('A tooltip that can wrap');
    expect(element.id).toBe('tooltip-test');
    expect(element.getAttribute('role')).toBe('tooltip');
    expect(element.style.maxWidth).toBe('160px');
    expect(element.classList).toContain('surface-200');
    expect(element.classList).toContain('dark:surface-800');
    expect(element.classList).toContain('after:-top-1');
    expect(element.classList).toContain('after:left-3');
    expect(element.classList).toContain('whitespace-normal');
    expect(element.classList).toContain('wrap-break-word');
  });

  it('does not constrain template content', async () => {
    const fixture = TestBed.createComponent(TemplateHost);

    await fixture.whenStable();

    const tooltip = fixture.nativeElement.querySelector(
      'ui-tooltip-content',
    ) as HTMLElement;
    expect(tooltip.querySelector('strong')?.textContent).toBe(
      'Template content',
    );
    expect(tooltip.style.maxWidth).toBe('');
    expect(tooltip.classList).not.toContain('whitespace-normal');
  });
});
