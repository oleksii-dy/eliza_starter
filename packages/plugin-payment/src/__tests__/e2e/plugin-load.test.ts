import { describe, it, expect } from 'vitest';
import { paymentPlugin } from '../../index';

describe('Payment Plugin E2E', () => {
  it('should export a valid plugin object', () => {
    expect(paymentPlugin).toBeDefined();
    expect(paymentPlugin.name).toBe('payment');
    expect(paymentPlugin.description).toBeTruthy();
    expect(paymentPlugin.services).toBeDefined();
    expect(paymentPlugin.actions).toBeDefined();
  });

  it('should have required services', () => {
    expect(paymentPlugin.services).toBeDefined();
    expect(paymentPlugin.services!).toHaveLength(3);
    const serviceNames = paymentPlugin.services!.map((s: any) => s.serviceName);
    expect(serviceNames).toContain('payment');
    expect(serviceNames).toContain('payment-price-oracle');
    expect(serviceNames).toContain('universal-payment');
  });

  it('should have research action', () => {
    expect(paymentPlugin.actions).toBeDefined();
    expect(paymentPlugin.actions!).toHaveLength(1);
    const action = paymentPlugin.actions![0];
    expect(action.name).toBe('RESEARCH');
  });

  it('should have init function', () => {
    expect(paymentPlugin.init).toBeDefined();
    expect(typeof paymentPlugin.init).toBe('function');
  });
}); 