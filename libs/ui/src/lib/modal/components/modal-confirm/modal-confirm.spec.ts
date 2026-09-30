import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';

import * as axe from 'axe-core';

import { ModalConfirm, ModalConfirmDialogData } from './modal-confirm';

describe('ModalConfirm', () => {
  const close = vi.fn();
  const data: ModalConfirmDialogData = {
    cancelLabel: 'Cancel',
    confirmColor: 'danger',
    confirmLabel: 'Delete',
    content: 'This cannot be undone.',
    contentId: 'confirm-content',
    title: 'Delete project?',
    titleId: 'confirm-title',
  };

  beforeEach(() => {
    close.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: { close } },
      ],
    });
  });

  it('renders labelled content and returns explicit cancel and confirm results', async () => {
    const fixture = TestBed.createComponent(ModalConfirm);
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    const buttons = host.querySelectorAll<HTMLButtonElement>('button');

    expect(host.querySelector('h2')?.id).toBe(data.titleId);
    expect(host.querySelector('ui-modal-content')?.id).toBe(data.contentId);
    expect(host.textContent).toContain(data.content);
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.classList).toContain('rounded-lg');
      expect(button.classList).toContain('border');
      expect(button.classList).toContain('border-primary-400');
    }
    expect((await axe.run(host)).violations).toEqual([]);

    buttons[0].click();
    buttons[1].click();
    expect(close).toHaveBeenNthCalledWith(1, false);
    expect(close).toHaveBeenNthCalledWith(2, true);
  });
});
