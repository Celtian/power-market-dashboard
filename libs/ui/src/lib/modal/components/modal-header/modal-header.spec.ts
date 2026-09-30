import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ButtonIcon } from '../../../button/public-api';
import { ModalHeader } from './modal-header';

describe('ModalHeader', () => {
  it('renders a bordered icon button and emits when close is requested', async () => {
    const closeClicked = vi.fn();
    const fixture = TestBed.createComponent(ModalHeader);
    fixture.componentRef.setInput('modalTitle', 'Example modal');
    fixture.componentRef.setInput('showCloseButton', true);
    fixture.componentInstance.closeClicked.subscribe(closeClicked);
    await fixture.whenStable();

    const closeButtonDebugElement = fixture.debugElement.query(
      By.directive(ButtonIcon),
    );
    const closeButton =
      closeButtonDebugElement.nativeElement as HTMLButtonElement;
    const heading = fixture.nativeElement.querySelector(
      'h2',
    ) as HTMLHeadingElement;

    expect(fixture.nativeElement.hasAttribute('title')).toBe(false);
    expect(heading.textContent).toBe('Example modal');
    expect(closeButton.getAttribute('aria-label')).toBe('Close');
    expect(closeButton.classList).toContain('border');

    closeButton.click();
    expect(closeClicked).toHaveBeenCalledOnce();
  });
});
