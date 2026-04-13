import { expect, test, type Locator, type Page } from '@playwright/test'

async function createDeck(page: Page, name: string) {
  await page.goto('/')
  await page.getByRole('button', { name: /new/i }).click()
  await page.getByPlaceholder('My deck').fill(name)
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page).toHaveURL(/\/p\/\d+/)
}

async function renameSlide(thumbnail: Locator, oldTitle: string, newTitle: string) {
  await thumbnail.hover()
  await thumbnail.getByLabel(`Rename ${oldTitle}`).click()
  await thumbnail.locator('input').fill(newTitle)
  await thumbnail.locator('input').press('Enter')
}

async function openDeckSettings(page: Page) {
  await page.getByTitle('Presentation settings').click()
  await expect(page).toHaveURL(/\/settings$/)
}

test.describe('Home page', () => {
  test('shows the seeded presentation card', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Decks')).toBeVisible()
    await expect(page.getByLabel('Open LLM & Agent Basics')).toBeVisible()
    await page.getByLabel('Open LLM & Agent Basics').click()
    await expect(page).toHaveURL(/\/p\/\d+$/)
    await expect(page.getByTitle('Presentation settings')).toBeVisible()
  })
})

test.describe('User deck flow', () => {
  test('supports create, edit, reorder, theme update, and deletion flows', async ({ page }) => {
    const deckName = `E2E Deck ${Date.now()}`

    await createDeck(page, deckName)
    await expect(page.getByText(deckName)).toBeVisible()

    await page.getByLabel('Add slide').click()
    await expect(page.getByTestId('slide-thumbnail')).toHaveCount(1)

    const firstThumbnail = page.getByTestId('slide-thumbnail').first()
    await renameSlide(firstThumbnail, 'New slide', 'Intro slide')
    await expect(firstThumbnail.getByText('Intro slide')).toBeVisible()

    await firstThumbnail.hover()
    await page.getByLabel('Edit Intro slide').click()
    await expect(page).toHaveURL(/\/edit\/\d+$/)

    await page.getByRole('button', { name: /text/i }).click()
    await page.getByPlaceholder('Markdown content…').fill('Hello **world**')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/\/p\/\d+$/)

    await firstThumbnail.click()
    await expect(page.getByText('Hello world')).toBeVisible()
    await page.getByRole('button', { name: /overview/i }).click()

    await page.getByLabel('Add slide').click()
    await expect(page.getByTestId('slide-thumbnail')).toHaveCount(2)

    const secondThumbnail = page.getByTestId('slide-thumbnail').nth(1)
    await renameSlide(secondThumbnail, 'New slide', 'Second slide')
    await expect(secondThumbnail.getByText('Second slide')).toBeVisible()

    const firstBox = await page.getByTestId('slide-thumbnail').nth(0).boundingBox()
    const secondBox = await page.getByTestId('slide-thumbnail').nth(1).boundingBox()
    if (!firstBox || !secondBox) throw new Error('slide thumbnails did not render')

    await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2, { steps: 12 })
    await page.mouse.up()

    await expect(page.getByTestId('slide-thumbnail').nth(0).getByText('Second slide')).toBeVisible()

    await page.getByTestId('slide-thumbnail').nth(0).hover()
    page.once('dialog', dialog => dialog.accept())
    await page.getByLabel('Delete Second slide').click()
    await expect(page.getByTestId('slide-thumbnail')).toHaveCount(1)

    await openDeckSettings(page)
    await page.getByRole('button', { name: /neon/i }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Saved')).toBeVisible()
    await page.getByTestId('breadcrumb').getByRole('link').filter({ hasText: deckName }).click()
    await expect(page.getByText('neon', { exact: true })).toBeVisible()

    await page.getByTestId('breadcrumb').getByRole('link', { name: 'Home' }).click()
    page.once('dialog', dialog => dialog.accept())
    await page.getByLabel(`Delete ${deckName}`).click()
    await expect(page.getByText(deckName)).toHaveCount(0)
  })
})
