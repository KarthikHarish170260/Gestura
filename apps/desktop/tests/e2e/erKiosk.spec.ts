import { test, expect } from '@playwright/test';

test.describe('Gestura-ER: Bi-Directional Emergency Triage Kiosk E2E Flow', () => {
  test('renders dual-split kiosk interface with patient terminal and staff dashboard', async ({ page }) => {
    await page.goto('/');

    // Header & Brand Check
    await expect(page.locator('h1')).toContainText('GESTURA');
    await expect(page.getByText(/Fixed Emergency Triage Kiosk/)).toBeVisible();

    // Patient Kiosk Panel (Left)
    await expect(page.getByText(/Patient Kiosk View/)).toBeVisible();
    await expect(page.getByText(/One-Tap AAC Fallback Tray/)).toBeVisible();

    // Staff Triage Dashboard (Right)
    await expect(page.getByText(/Staff \/ Nurse Triage Dashboard/)).toBeVisible();
    await expect(page.getByText(/Emergency Severity Index/)).toBeVisible();
  });

  test('builds multi-gloss sequence and auto-generates ESI-2 clinical triage card', async ({ page }) => {
    await page.goto('/');

    // Expand the 50-concept simulator drawer
    const drawerBtn = page.getByText(/50-Concept Bounded Lexicon Quick-Sign Simulator/);
    await drawerBtn.click();

    // Click anatomy tab and simulate "+ CHEST"
    await page.getByRole('button', { name: '+ CHEST' }).first().click();
    await expect(page.getByText('[CHEST]').first()).toBeVisible();

    // Click symptom tab and simulate "+ PAIN"
    await page.getByRole('button', { name: 'symptom' }).click();
    await page.getByRole('button', { name: '+ PAIN' }).first().click();

    // Click temporal tab and simulate "+ MORNING"
    await page.getByRole('button', { name: 'temporal' }).click();
    await page.getByRole('button', { name: '+ MORNING' }).first().click();

    // Verify Staff Triage Summary Card auto-populated with ESI-2
    await expect(page.getByText(/ESI-2: Emergent/).first()).toBeVisible();
    await expect(page.getByText(/Chest Pain/).first()).toBeVisible();
    await expect(page.getByText(/Target Response/).first()).toBeVisible();
    await expect(page.getByText(/STAT ECG/).first()).toBeVisible();
  });

  test('staff one-click quick action transmits visual action card to patient view', async ({ page }) => {
    await page.goto('/');

    // Staff clicks "🔴 Sit in Wheelchair" quick chip
    const wheelchairChip = page.getByRole('button', { name: /Sit in Wheelchair/ }).first();
    await wheelchairChip.click();

    // Verify Visual Action Card appears on Patient View
    await expect(page.getByText(/Visual Action Cards/)).toBeVisible();
    await expect(page.getByText('Sit in Wheelchair').first()).toBeVisible();
    await expect(page.getByText(/Please sit in the transport wheelchair/).first()).toBeVisible();
  });

  test('one-tap AAC fallback body map updates patient location and pain scale', async ({ page }) => {
    await page.goto('/');

    // Expand body map if collapsed
    const expandMapBtn = page.getByText('Expand Body Map');
    if (await expandMapBtn.isVisible()) {
      await expandMapBtn.click();
    }

    // Tap "Head / Brain" button in body map tray
    const headChip = page.getByRole('button', { name: 'Head / Brain' }).first();
    await headChip.click();

    // Verify selection badge
    await expect(page.getByText(/Selected: HEAD/)).toBeVisible();

    // Select pain face "Severe (7-8)"
    const severeFaceBtn = page.getByRole('button', { name: /Severe/ }).first();
    await severeFaceBtn.click();

    // Staff view reflects HEAD
    await expect(page.getByText('HEAD').first()).toBeVisible();
  });

  test('switches to direct textpad baseline and back', async ({ page }) => {
    await page.goto('/');

    // Click mode switch button
    const switchBtn = page.getByRole('button', { name: /Switch to Direct Textpad/ });
    await switchBtn.click();

    // Verify Direct Textpad mode
    await expect(page.getByText(/Direct Emergency Textpad Mode Active/)).toBeVisible();
    const textarea = page.getByPlaceholder(/Type your emergency symptoms here/);
    await textarea.fill('Severe chest tightness and difficulty breathing');

    // Return to Camera Kiosk
    const returnBtn = page.getByRole('button', { name: /Return to Camera/ });
    await returnBtn.click();

    await expect(page.getByText(/Patient Kiosk View/)).toBeVisible();
  });

  test('launches A/B Evaluation Benchmark Harness and logs comparative metrics', async ({ page }) => {
    await page.goto('/');

    // Click "A/B Benchmark Eval" button
    const evalBtn = page.getByRole('button', { name: /Benchmark/ }).first();
    await evalBtn.click();

    // Modal appears
    await expect(page.getByText(/Clinical Evaluation Harness/)).toBeVisible();

    // Click "Start Gestura-ER Multimodal"
    const startMultimodalBtn = page.getByRole('button', { name: /Start Gestura-ER Multimodal/ });
    await startMultimodalBtn.click();

    // Verify running HUD
    await expect(page.getByText(/Scenario Running:/)).toBeVisible();

    // Auto-emit signs
    const autoEmitBtn = page.getByRole('button', { name: 'Auto-Emit Patient Signs' });
    await autoEmitBtn.click();

    // Complete scenario
    const completeBtn = page.getByRole('button', { name: /Complete \(Pass\)/ });
    await completeBtn.click();

    // Verify logged in comparative table
    await expect(page.getByText('MULTIMODAL').first()).toBeVisible();
    await expect(page.getByText('Pass').first()).toBeVisible();
  });
});
