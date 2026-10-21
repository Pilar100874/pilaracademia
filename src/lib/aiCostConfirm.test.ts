/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { isAiCostConfirmEnabled, setAiCostConfirmEnabled } from './aiCostConfirm';

test('confirmação de custo da IA: ligada por padrão, desliga e religa pelo Perfil', () => {
  localStorage.removeItem('pilar.ai-cost-confirm');
  expect(isAiCostConfirmEnabled()).toBe(true);

  setAiCostConfirmEnabled(false);
  expect(isAiCostConfirmEnabled()).toBe(false);

  setAiCostConfirmEnabled(true);
  expect(isAiCostConfirmEnabled()).toBe(true);
});
