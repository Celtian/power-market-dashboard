import { Service } from '@angular/core';

@Service()
export class SonnerToasterRegistry {
  private count = 0;

  public register(): void {
    this.count++;
  }

  public unregister(): void {
    this.count = Math.max(0, this.count - 1);
  }

  public hasToaster(): boolean {
    return this.count > 0;
  }
}
