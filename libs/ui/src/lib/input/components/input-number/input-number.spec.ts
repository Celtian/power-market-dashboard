import { TestBed } from '@angular/core/testing';

import { InputNumber } from './input-number';

describe('InputNumber', () => {
  it('synchronizes numeric values and exposes number attributes', async () => {
    const fixture = TestBed.createComponent(InputNumber);
    fixture.componentRef.setInput('labelId', 'amount');
    fixture.componentRef.setInput('min', 1);
    fixture.componentRef.setInput('max', 10);
    fixture.componentRef.setInput('step', 0.5);
    fixture.componentRef.setInput('placeholder', 'Amount');
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.id).toBe('amount');
    expect(input.min).toBe('1');
    expect(input.max).toBe('10');
    expect(input.step).toBe('0.5');
    expect(input.inputMode).toBe('decimal');

    input.value = '4.5';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe(4.5);

    input.value = '';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it('clears a numeric value and restores input focus', async () => {
    const fixture = TestBed.createComponent(InputNumber);
    fixture.componentInstance.value.set(42);
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const clearButton = fixture.nativeElement.querySelector(
      'button[aria-label="Clear input"]',
    ) as HTMLButtonElement;
    expect(clearButton).not.toBeNull();

    clearButton.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBeNull();
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it.each(['disabled', 'readonly'] as const)('does not clear a %s value', async (state) => {
    const fixture = TestBed.createComponent(InputNumber);
    fixture.componentRef.setInput(state, true);
    fixture.componentInstance.value.set(42);
    await fixture.whenStable();

    const clearButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(clearButton.disabled).toBe(true);

    clearButton.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe(42);
  });

  it('handles integer input mode, touch, validation, readonly, hidden state, and focus', async () => {
    const fixture = TestBed.createComponent(InputNumber);
    let touchCount = 0;
    fixture.componentInstance.touch.subscribe(() => touchCount++);
    fixture.componentRef.setInput('step', 2);
    fixture.componentRef.setInput('invalid', true);
    fixture.componentRef.setInput('readonly', true);
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.inputMode).toBe('numeric');
    expect(input.readOnly).toBe(true);

    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(touchCount).toBe(1);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.classList).toContain('border-red-500');

    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(input);

    fixture.componentRef.setInput('hidden', true);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).hidden).toBe(true);
  });
});
