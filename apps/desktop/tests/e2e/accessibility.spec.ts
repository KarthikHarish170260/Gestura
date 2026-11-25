import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('GESTURA WCAG 2.2 AA Accessibility Audit - Pharmacy Screens', () => {
  test('Pharmacy Home screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (criticalViolations.length > 0) {
      console.log('Home violations:', criticalViolations.map(v => ({ id: v.id, help: v.help })));
    }
    expect(criticalViolations).toEqual([]);
  });

  test('Sign to Pharmacist screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Sign to Pharmacist/i }).click();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (criticalViolations.length > 0) {
      console.log('Sign screen violations:', criticalViolations.map(v => ({ id: v.id, help: v.help })));
    }
    expect(criticalViolations).toEqual([]);
  });

  test('Pharmacist Reply screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Pharmacist Reply/i }).click();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (criticalViolations.length > 0) {
      console.log('Reply screen violations:', criticalViolations.map(v => ({ id: v.id, help: v.help })));
    }
    expect(criticalViolations).toEqual([]);
  });

  test('Practice Studio screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Practice/i }).first().click();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (criticalViolations.length > 0) {
      console.log('Practice violations:', criticalViolations.map(v => ({ id: v.id, help: v.help })));
    }
    expect(criticalViolations).toEqual([]);
  });

  test('Session History screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /History/i }).first().click();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (criticalViolations.length > 0) {
      console.log('History violations:', criticalViolations.map(v => ({ id: v.id, help: v.help })));
    }
    expect(criticalViolations).toEqual([]);
  });
});
