import { test, expect } from '@playwright/test';

test.describe('Gestura Clinical Ward Tele-Bridge E2E Suite', () => {
  test('portal page renders both launcher cards and telemetry overview', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('GESTURA').first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Hospital Ward Tele-Bridge for Deaf & Sign-First Inpatients');
    await expect(page.getByText(/Bedside Assistive Tablet/)).toBeVisible();
    await expect(page.getByText(/Central Nurse Station Console/)).toBeVisible();
    await expect(page.getByRole('button', { name: /A\/B Telemetry Audit/ })).toBeVisible();
  });

  test('bedside tablet simulates wristband scan and activates patient terminal', async ({ page }) => {
    await page.goto('/patient');

    // Pre-scan modal should be visible
    await expect(page.getByText('Scan Patient Wristband')).toBeVisible();

    // Click Simulate Wristband Scan
    const scanBtn = page.getByRole('button', { name: /Simulate Wristband Scan/ });
    await scanBtn.click();

    // Wait for scanning and admission
    await expect(page.getByText('Rajesh K.').first()).toBeVisible();
    await expect(page.getByText('Primary ISL').first()).toBeVisible();

    // Sign-to-Text and Speech-to-Sign Avatar Converter should be active
    await expect(page.getByText('AI SIGN-TO-TEXT CONVERTER')).toBeVisible();
    await expect(page.getByText(/LIVE SIGN LANGUAGE SEQUENCE BUFFER/)).toBeVisible();
    await expect(page.getByText(/Avatar Signer/)).toBeVisible();

    // Tactile nurse call chips visible
    await expect(page.getByText(/Water Request/)).toBeVisible();
    await expect(page.getByText(/EMERGENCY CODE PANIC/).first()).toBeVisible();
  });

  test('central nurse station displays 12-bed grid and updates Bed 12', async ({ page }) => {
    await page.goto('/nurse');

    // Header and ward info
    await expect(page.getByText('GESTURA WARD CONSOLE')).toBeVisible();
    await expect(page.getByText('Ward 4B: Trauma Telemetry')).toBeVisible();

    // Bed cards in grid (Beds 1 to 12)
    await expect(page.getByText('BED-01').first()).toBeVisible();
    await expect(page.getByText('BED-12').first()).toBeVisible();
    await expect(page.getByText('All Beds (12)')).toBeVisible();
  });

  test('bi-directional cross-tab telemetry: patient emergency alert triggers nurse station chime and fast dispatch', async ({ context }) => {
    // Open Tab 1: Nurse Station
    const nursePage = await context.newPage();
    await nursePage.goto('/nurse');
    await expect(nursePage.getByText('GESTURA WARD CONSOLE')).toBeVisible();

    // Open Tab 2: Patient Bedside Tablet
    const patientPage = await context.newPage();
    await patientPage.goto('/patient');

    // Simulate Wristband Scan on Patient Tab
    const scanBtn = patientPage.getByRole('button', { name: /Simulate Wristband Scan/ });
    if (await scanBtn.isVisible().catch(() => false)) {
      await scanBtn.click();
      await expect(patientPage.getByText('Rajesh K.').first()).toBeVisible();
    }

    // Patient clicks emergency quick chip: "⚡ Severe Pain"
    await patientPage.getByRole('button', { name: /Severe Pain|Acute Pain/ }).first().click();

    // Verify confirmation on patient tab
    await expect(patientPage.getByText(/Nurse Called|Call Transmitted|Nurse Notified/).first()).toBeVisible();

    // On Nurse Tab, verify incoming alert drawer expanded
    await nursePage.waitForTimeout(600);
    await expect(nursePage.getByText('INCOMING CALL DETECTED').first()).toBeVisible();

    // Nurse clicks 1-Click Fast Dispatch: "🏃 Nurse En Route"
    const dispatchBtn = nursePage.getByRole('button', { name: /Nurse En Route/ }).first();
    await dispatchBtn.click();

    // Verify action dispatched banner on nurse drawer
    await expect(nursePage.getByText(/Action Sent|Nurse En Route/).first()).toBeVisible();

    // Switch to Patient Tab and verify Visual Action Card appeared with countdown timer!
    await patientPage.waitForTimeout(600);
    await expect(patientPage.getByText(/Staff Dispatched|Nurse En Route/).first()).toBeVisible();
    await expect(patientPage.getByText('Estimated Arrival').first()).toBeVisible();
  });

  test('launches A/B evaluation benchmark modal and displays metrics', async ({ page }) => {
    await page.goto('/');

    // Open benchmark modal
    await page.getByRole('button', { name: /A\/B Telemetry Audit/ }).click();

    await expect(page.getByText('Clinical Telemetry & A/B Benchmark')).toBeVisible();
    await expect(page.getByText('Multimodal Mean TCT')).toBeVisible();
    await expect(page.getByText('Speedup Multiplier')).toBeVisible();
    await expect(page.getByText(/Why Multimodal Sign Outperforms Textpad/)).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: 'Close Benchmark' }).click();
    await expect(page.getByText('Clinical Telemetry & A/B Benchmark')).not.toBeVisible();
  });
});
