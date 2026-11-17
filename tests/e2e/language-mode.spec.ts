import { expect, test } from "@playwright/test";

test("switches the public interface to Chinese and remembers it across navigation and reload", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.getByRole("button", { name: "简体中文" }).click();
  await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");

  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByText("请输入密码。")).toBeVisible();
  await page.getByRole("link", { name: "注册账号" }).click();
  await expect(page.getByRole("heading", { name: "注册账号" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "注册账号" })).toBeVisible();

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
});
