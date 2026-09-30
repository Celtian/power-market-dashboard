import { ComponentFixture, TestBed } from '@angular/core/testing';

import { beforeEach, describe, expect, it } from 'vitest';

import { provideUiI18n } from '../../../helpers/ui-i18n.provider';
import { BottomNavigation } from './bottom-navigation';

describe('BottomNavigation', () => {
  let fixture: ComponentFixture<BottomNavigation>;
  let fixedFooter: HTMLDivElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideUiI18n()],
    });

    fixture = TestBed.createComponent(BottomNavigation);
    fixture.componentRef.setInput('ariaLabel', 'Primary navigation');
    await fixture.whenStable();
    fixedFooter = fixture.nativeElement.querySelector('[ngxFixedFooter]');
  });

  it('supports desktop content by default', () => {
    expect(fixedFooter.classList).not.toContain('sm:hidden');
  });

  it('hides the measured footer at desktop widths in mobile-only mode', async () => {
    fixture.componentRef.setInput('mobileOnly', true);
    await fixture.whenStable();

    expect(fixedFooter.classList).toContain('sm:hidden');
  });

  it('restores desktop content when mobile-only mode is cleared', async () => {
    fixture.componentRef.setInput('mobileOnly', true);
    await fixture.whenStable();
    fixture.componentRef.setInput('mobileOnly', false);
    await fixture.whenStable();

    expect(fixedFooter.classList).not.toContain('sm:hidden');
  });
});
