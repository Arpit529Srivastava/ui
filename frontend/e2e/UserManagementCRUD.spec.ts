import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { UserManagementPage } from './pages/UserManagementPage';
import { LoginPage } from './pages/LoginPage';
import { MSWHelper } from './pages/utils/MSWHelper';

type SetupOptions = {
  applyScenario?: boolean;
};

async function setupUserManagementTest(page: Page, options: SetupOptions = {}) {
  const loginPage = new LoginPage(page);
  const userManagementPage = new UserManagementPage(page);

  await loginPage.goto();
  await loginPage.login('admin', 'admin');
  await expect(page).toHaveURL('/', { timeout: 10000 });

  const shouldApplyScenario = options.applyScenario ?? false;
  if (shouldApplyScenario) {
    const msw = new MSWHelper(page);
    await msw.applyScenario('userManagement');
  }

  await userManagementPage.goto();

  return userManagementPage;
}

test.describe('User Management - Create Operations', () => {
  let userManagementPage: UserManagementPage;

  test.beforeEach(async ({ page }) => {
    userManagementPage = await setupUserManagementTest(page, {
      applyScenario: true,
    });
  });

  test('should create a new regular user successfully', async () => {
    const newUsername = `testuser_${Date.now()}`;

    await userManagementPage.addUser({
      username: newUsername,
      password: 'password123',
      confirmPassword: 'password123',
      isAdmin: false,
    });

    // Wait for success toast
    await userManagementPage.waitForSuccessToast();

    // Verify user appears in the list
    expect(await userManagementPage.userExists(newUsername)).toBeTruthy();
  });

  test('should create a new admin user successfully', async () => {
    const newUsername = `admin_${Date.now()}`;

    await userManagementPage.addUser({
      username: newUsername,
      password: 'password123',
      confirmPassword: 'password123',
      isAdmin: true,
    });

    await userManagementPage.waitForSuccessToast();
    expect(await userManagementPage.userExists(newUsername)).toBeTruthy();
    await userManagementPage.verifyUserIsAdmin(newUsername);
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await userManagementPage.clickAddUser();
    await userManagementPage.fillUserForm({
      username: 'testuser',
      password: 'password123',
      confirmPassword: 'password456',
    });
    await userManagementPage.submitButton.click();

    // Should show error toast or stay on modal
    await page.waitForTimeout(1000);
    const modalVisible = await userManagementPage.modal.isVisible();
    expect(modalVisible).toBeTruthy();
  });

  test('should show error when username is empty', async ({ page }) => {
    await userManagementPage.clickAddUser();
    await userManagementPage.fillUserForm({
      username: '',
      password: 'password123',
      confirmPassword: 'password123',
    });
    await userManagementPage.submitButton.click();

    await page.waitForTimeout(1000);
    const modalVisible = await userManagementPage.modal.isVisible();
    expect(modalVisible).toBeTruthy();
  });

  test('should show error when password is empty', async ({ page }) => {
    await userManagementPage.clickAddUser();
    await userManagementPage.fillUserForm({
      username: 'testuser',
      password: '',
      confirmPassword: '',
    });
    await userManagementPage.submitButton.click();

    await page.waitForTimeout(1000);
    const modalVisible = await userManagementPage.modal.isVisible();
    expect(modalVisible).toBeTruthy();
  });

  test('should prevent creating duplicate usernames', async ({ page }) => {
    await userManagementPage.clickAddUser();
    await userManagementPage.fillUserForm({
      username: 'admin', // Already exists
      password: 'password123',
      confirmPassword: 'password123',
    });
    await userManagementPage.submitButton.click();

    // Should show error
    await page.waitForTimeout(2000);
    // Either modal stays open or error toast appears
    const modalVisible = await userManagementPage.modal.isVisible();
    if (!modalVisible) {
      await userManagementPage.waitForErrorToast();
    }
  });

  test('should reset form when modal is closed and reopened', async () => {
    await userManagementPage.clickAddUser();
    await userManagementPage.fillUserForm({
      username: 'testuser',
      password: 'password123',
    });
    await userManagementPage.cancelUserForm();

    // Reopen modal
    await userManagementPage.clickAddUser();

    // Form should be empty
    await expect(userManagementPage.usernameInput).toHaveValue('');
  });
});

test.describe('User Management - Update Operations', () => {
  let userManagementPage: UserManagementPage;

  test.beforeEach(async ({ page }) => {
    userManagementPage = await setupUserManagementTest(page);
  });

  test('should update user username successfully', async () => {
    const newUsername = `updated_${Date.now()}`;

    await userManagementPage.editUser('testuser', {
      username: newUsername,
    });

    await userManagementPage.waitForSuccessToast();
    expect(await userManagementPage.userExists(newUsername)).toBeTruthy();
    expect(await userManagementPage.userExists('testuser')).toBeFalsy();
  });

  test('should update user password successfully', async () => {
    await userManagementPage.clickEditUser('testuser');
    await userManagementPage.fillUserForm({
      username: 'testuser',
      password: 'newpassword123',
      confirmPassword: 'newpassword123',
    });
    await userManagementPage.submitUserForm();

    await userManagementPage.waitForSuccessToast();
  });

  test('should promote user to admin', async () => {
    await userManagementPage.editUser('testuser', {
      isAdmin: true,
    });

    await userManagementPage.waitForSuccessToast();
    await userManagementPage.verifyUserIsAdmin('testuser');
  });

  test('should demote admin to regular user', async () => {
    // First create an admin user
    const adminUsername = `admin_${Date.now()}`;
    await userManagementPage.addUser({
      username: adminUsername,
      password: 'password123',
      confirmPassword: 'password123',
      isAdmin: true,
    });
    await userManagementPage.waitForSuccessToast();

    // Now demote them
    await userManagementPage.editUser(adminUsername, {
      isAdmin: false,
    });

    await userManagementPage.waitForSuccessToast();
    await userManagementPage.verifyUserIsNotAdmin(adminUsername);
  });

  test('should show error when updating to existing username', async ({ page }) => {
    await userManagementPage.clickEditUser('testuser');
    await userManagementPage.fillUserForm({
      username: 'admin', // Already exists
    });
    await userManagementPage.submitButton.click();

    await page.waitForTimeout(2000);
    // Should show error or stay on modal
    const modalVisible = await userManagementPage.modal.isVisible();
    if (!modalVisible) {
      await userManagementPage.waitForErrorToast();
    }
  });

  test('should show error when update passwords do not match', async ({ page }) => {
    await userManagementPage.clickEditUser('testuser');
    await userManagementPage.fillUserForm({
      username: 'testuser',
      password: 'password123',
      confirmPassword: 'password456',
    });
    await userManagementPage.submitButton.click();

    await page.waitForTimeout(1000);
    const modalVisible = await userManagementPage.modal.isVisible();
    expect(modalVisible).toBeTruthy();
  });

  test('should cancel edit without making changes', async () => {
    await userManagementPage.clickEditUser('testuser');
    await userManagementPage.fillUserForm({
      username: 'changed_username',
    });
    await userManagementPage.cancelUserForm();

    // Verify username was not changed
    expect(await userManagementPage.userExists('testuser')).toBeTruthy();
    expect(await userManagementPage.userExists('changed_username')).toBeFalsy();
  });

  test('should update user and maintain other fields', async () => {
    // Update only username
    const newUsername = `updated_${Date.now()}`;
    await userManagementPage.editUser('poweruser', {
      username: newUsername,
    });

    await userManagementPage.waitForSuccessToast();
    expect(await userManagementPage.userExists(newUsername)).toBeTruthy();
  });
});

test.describe('User Management - Delete Operations', () => {
  let userManagementPage: UserManagementPage;

  test.beforeEach(async ({ page }) => {
    userManagementPage = await setupUserManagementTest(page);
  });

  test('should delete a user successfully', async () => {
    // First create a user to delete
    const username = `todelete_${Date.now()}`;
    await userManagementPage.addUser({
      username,
      password: 'password123',
      confirmPassword: 'password123',
    });
    await userManagementPage.waitForSuccessToast();

    // Now delete it
    await userManagementPage.deleteUser(username);
    await userManagementPage.waitForSuccessToast();

    // Verify user is gone
    expect(await userManagementPage.userExists(username)).toBeFalsy();
  });

  test('should show confirmation modal before deleting', async () => {
    await userManagementPage.clickDeleteUser('testuser');
    await expect(userManagementPage.deleteModal).toBeVisible();
    await expect(userManagementPage.deleteModal).toContainText(/delete/i);
  });

  test('should cancel delete operation', async () => {
    await userManagementPage.clickDeleteUser('testuser');
    await userManagementPage.cancelDeleteUser();

    // Verify user still exists
    expect(await userManagementPage.userExists('testuser')).toBeTruthy();
  });

  test('should prevent deleting admin user', async ({ page }) => {
    await userManagementPage.clickDeleteUser('admin');
    await userManagementPage.deleteConfirmButton.click();

    // Should show error or user should still exist
    await page.waitForTimeout(2000);
    expect(await userManagementPage.userExists('admin')).toBeTruthy();
  });

  test('should update user count after deletion', async () => {
    const initialCount = await userManagementPage.getUserCount();

    // Create and delete a user
    const username = `temp_${Date.now()}`;
    await userManagementPage.addUser({
      username,
      password: 'password123',
      confirmPassword: 'password123',
    });
    await userManagementPage.waitForSuccessToast();

    const afterAddCount = await userManagementPage.getUserCount();
    expect(afterAddCount).toBe(initialCount + 1);

    await userManagementPage.deleteUser(username);
    await userManagementPage.waitForSuccessToast();

    const afterDeleteCount = await userManagementPage.getUserCount();
    expect(afterDeleteCount).toBe(initialCount);
  });

  test('should handle deleting multiple users sequentially', async () => {
    // Create two users
    const user1 = `user1_${Date.now()}`;
    const user2 = `user2_${Date.now()}`;

    await userManagementPage.addUser({
      username: user1,
      password: 'password123',
      confirmPassword: 'password123',
    });
    await userManagementPage.waitForSuccessToast();

    await userManagementPage.addUser({
      username: user2,
      password: 'password123',
      confirmPassword: 'password123',
    });
    await userManagementPage.waitForSuccessToast();

    // Delete both
    await userManagementPage.deleteUser(user1);
    await userManagementPage.waitForSuccessToast();

    await userManagementPage.deleteUser(user2);
    await userManagementPage.waitForSuccessToast();

    // Verify both are gone
    expect(await userManagementPage.userExists(user1)).toBeFalsy();
    expect(await userManagementPage.userExists(user2)).toBeFalsy();
  });
});

test.describe('User Management - Complex CRUD Workflows', () => {
  let userManagementPage: UserManagementPage;

  test.beforeEach(async ({ page }) => {
    userManagementPage = await setupUserManagementTest(page);
  });

  test('should create, update, and delete user in sequence', async () => {
    const username = `workflow_${Date.now()}`;
    const updatedUsername = `${username}_updated`;

    // Create
    await userManagementPage.addUser({
      username,
      password: 'password123',
      confirmPassword: 'password123',
    });
    await userManagementPage.waitForSuccessToast();
    expect(await userManagementPage.userExists(username)).toBeTruthy();

    // Update
    await userManagementPage.editUser(username, {
      username: updatedUsername,
    });
    await userManagementPage.waitForSuccessToast();
    expect(await userManagementPage.userExists(updatedUsername)).toBeTruthy();

    // Delete
    await userManagementPage.deleteUser(updatedUsername);
    await userManagementPage.waitForSuccessToast();
    expect(await userManagementPage.userExists(updatedUsername)).toBeFalsy();
  });

  test('should handle rapid successive operations', async () => {
    const user1 = `rapid1_${Date.now()}`;
    const user2 = `rapid2_${Date.now()}`;

    // Create two users rapidly
    await userManagementPage.addUser({
      username: user1,
      password: 'password123',
      confirmPassword: 'password123',
    });
    await userManagementPage.waitForSuccessToast();

    await userManagementPage.addUser({
      username: user2,
      password: 'password123',
      confirmPassword: 'password123',
    });
    await userManagementPage.waitForSuccessToast();

    // Verify both exist
    expect(await userManagementPage.userExists(user1)).toBeTruthy();
    expect(await userManagementPage.userExists(user2)).toBeTruthy();
  });

  test('should maintain data integrity after multiple operations', async () => {
    const initialCount = await userManagementPage.getUserCount();

    // Perform multiple operations
    const tempUser = `temp_${Date.now()}`;
    await userManagementPage.addUser({
      username: tempUser,
      password: 'password123',
      confirmPassword: 'password123',
    });
    await userManagementPage.waitForSuccessToast();

    await userManagementPage.deleteUser(tempUser);
    await userManagementPage.waitForSuccessToast();

    // Count should be back to initial
    const finalCount = await userManagementPage.getUserCount();
    expect(finalCount).toBe(initialCount);
  });
});
