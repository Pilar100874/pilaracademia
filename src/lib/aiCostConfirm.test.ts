/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { isAiCostConfirmEnabled, setAiCostConfirmEnabled } from './aiCostConfirm';

// Bun não expõe localStorage no runner de testes; usa um stub simples.
const backing = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => backing.get(k) ?? null,
  setItem: (k: string, v: string) => { backing.set(k, v); },
  removeItem: (k: string) => { backing.delete(k); },
};


test('confirmação de custo da IA: ligada por padrão, desliga e religa pelo Perfil', () => {
  localStorage.removeItem('pilar.ai-cost-confirm');
  expect(isAiCostConfirmEnabled()).toBe(true);

  setAiCostConfirmEnabled(false);
  expect(isAiCostConfirmEnabled()).toBe(false);

  setAiCostConfirmEnabled(true);
  expect(isAiCostConfirmEnabled()).toBe(true);
});
