import { TestBed } from '@angular/core/testing';

import { Flag } from './flag';

describe('Flag', () => {
  it('renders a responsive small flag with its generated country name', async () => {
    const fixture = TestBed.createComponent(Flag);
    fixture.componentRef.setInput('countryCode', 'gb');
    await fixture.whenStable();

    const source = fixture.nativeElement.querySelector('source') as HTMLSourceElement;
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;

    expect(source.srcset).toContain('/flags/20x15/gb.png');
    expect(source.srcset).toContain('/flags/60x45/gb.png 3x');
    expect(image.src).toContain('/flags/20x15/gb.png');
    expect(image.width).toBe(20);
    expect(image.height).toBe(15);
    expect(image.alt).toBe('United Kingdom');
  });

  it('renders a responsive large flag', async () => {
    const fixture = TestBed.createComponent(Flag);
    fixture.componentRef.setInput('countryCode', 'cz');
    fixture.componentRef.setInput('size', 'lg');
    await fixture.whenStable();

    const source = fixture.nativeElement.querySelector('source') as HTMLSourceElement;
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;

    expect(source.srcset).toContain('/flags/120x90/cz.png 3x');
    expect(image.src).toContain('/flags/40x30/cz.png');
    expect(image.width).toBe(40);
    expect(image.height).toBe(30);
  });

  it('updates its source and optional accessible country name', async () => {
    const fixture = TestBed.createComponent(Flag);
    fixture.componentRef.setInput('countryCode', 'gb');
    fixture.componentRef.setInput('countryName', 'English');
    await fixture.whenStable();

    fixture.componentRef.setInput('countryCode', 'cz');
    fixture.componentRef.setInput('countryName', 'Czech');
    await fixture.whenStable();

    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(image.src).toContain('/flags/20x15/cz.png');
    expect(image.alt).toBe('Czech');
  });
});
