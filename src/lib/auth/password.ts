import "server-only";

import bcrypt from "bcryptjs";

/**
 * 密码哈希。
 *
 * bcrypt cost = 10：约 50–80ms/次，足够抵抗离线爆破，又不会拖慢登录。
 * 明文密码**永不出现在日志、响应和数据库中**。
 */
const BCRYPT_COST = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
