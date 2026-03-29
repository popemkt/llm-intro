import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('shows built-in presentations', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Presentations')).toBeVisible()
    await expect(page.getByText('LLM & Agent Basics')).toBeVisible()
    await expect(page.getByText('Built-in', { exact: false })).toBeVisible()
  })

  test('can navigate to a code presentation', async ({ page }) => {
    await page.goto('/')
    await page.getByText('LLM & Agent Basics').click()
    await expect(page).toHaveURL('/p/llm-intro')
    await expect(page.getByText('8 slides')).toBeVisible()
  })
})

test.describe('Code presentation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/p/llm-intro')
  })

  test('overview shows 8 slide thumbnails', async ({ page }) => {
    const thumbnails = page.locator('button.group')
    await expect(thumbnails).toHaveCount(8)
  })

  test('clicking a slide thumbnail enters presentation mode', async ({ page }) => {
    await page.locator('button.group').first().click()
    await expect(page.getByRole('button', { name: /overview/i })).toBeVisible()
    await expect(page.locator('text=1 / 8')).toBeVisible()
  })

  test('ESC returns to overview', async ({ page }) => {
    await page.locator('button.group').first().click()
    await page.keyboard.press('Escape')
    await expect(page.getByText('8 slides')).toBeVisible()
  })

  test('arrow keys navigate slides', async ({ page }) => {
    await page.locator('button.group').first().click()
    await expect(page.locator('text=1 / 8')).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('text=2 / 8')).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('text=1 / 8')).toBeVisible()
  })
})

test.describe('DB presentation creation', () => {
  test('can create a new presentation from home page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /new/i }).click()
    await page.getByPlaceholder('My presentation').fill('Test Presentation')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page).toHaveURL(/\/p\/\d+/)
    await expect(page.getByText('Test Presentation')).toBeVisible()
  })

  test('can add a slide to a DB presentation', async ({ page }) => {
    // Create a presentation first
    await page.goto('/')
    await page.getByRole('button', { name: /new/i }).click()
    await page.getByPlaceholder('My presentation').fill('E2E Test Pres')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page).toHaveURL(/\/p\/\d+/)

    // Add a slide
    await page.getByText('Add slide').click()
    await expect(page.getByText('New slide')).toBeVisible()
  })
})
