import { SonnerToasterRegistry } from './sonner-toaster-registry';

describe('SonnerToasterRegistry', () => {
  let registry: SonnerToasterRegistry;

  beforeEach(() => {
    registry = new SonnerToasterRegistry();
  });

  it('should report no toaster initially', () => {
    expect(registry.hasToaster()).toBe(false);
  });

  it('should track registered toasters', () => {
    registry.register();
    registry.register();

    expect(registry.hasToaster()).toBe(true);

    registry.unregister();
    expect(registry.hasToaster()).toBe(true);

    registry.unregister();
    expect(registry.hasToaster()).toBe(false);
  });

  it('should not decrement below zero', () => {
    registry.unregister();
    registry.register();
    registry.unregister();

    expect(registry.hasToaster()).toBe(false);
  });
});
