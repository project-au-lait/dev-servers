import { expect, test } from './base';

const sqAdmin = { id: 'admin', password: 'admin' };

test('login', async ({ page, baseURL, user }) => {
  if (user.id === 'admin') user = sqAdmin;

  await page.goto('/sonarqube/sessions/new');

  await page.locator('#login-input').fill(user.id);
  await page.locator('#password-input').fill(user.password);
  await page.locator('#login_form').getByRole('button').click();
  await page.waitForURL(/.*(projects|account).*/);

  if (page.url() === baseURL + '/sonarqube/account/reset_password') {
    await expect(page.getByText('Update your password')).toBeVisible();
    return;
  }

  await page.locator('#userAccountMenuDropdown-trigger').click();
  await expect(
    page
      .locator('#userAccountMenuDropdown-dropdown')
      .getByText(user.id, { exact: true }),
  ).toBeVisible();
});
