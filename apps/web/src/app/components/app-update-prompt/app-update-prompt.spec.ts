import { DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';

import { TranslocoService } from '@jsverse/transloco';

import { translocoTestingModule } from '../../transloco-testing';
import { AppUpdatePrompt } from './app-update-prompt';

describe('AppUpdatePrompt', () => {
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [AppUpdatePrompt, translocoTestingModule()],
      providers: [{ provide: DialogRef, useValue: { close } }],
    }).compileComponents();
  });

  it('renders the update message', async () => {
    const fixture = TestBed.createComponent(AppUpdatePrompt);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('A new version is available');
    expect(fixture.nativeElement.textContent).toContain('Reload to use the latest version.');
  });

  it('closes without updating when dismissed', async () => {
    const fixture = TestBed.createComponent(AppUpdatePrompt);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('[data-app-update-dismiss]')?.click();

    expect(close).toHaveBeenCalledWith(false);
  });

  it('requests an update when confirmed', async () => {
    const fixture = TestBed.createComponent(AppUpdatePrompt);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('[data-app-update-confirm]')?.click();

    expect(close).toHaveBeenCalledWith(true);
  });

  it('renders the Czech update message', async () => {
    TestBed.inject(TranslocoService).setActiveLang('cs');
    const fixture = TestBed.createComponent(AppUpdatePrompt);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Je dostupná nová verze');
    expect(fixture.nativeElement.textContent).toContain('Aktualizovat');
  });
});
