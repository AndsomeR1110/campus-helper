import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.platform === "win32" ? "gradlew.bat" : "./gradlew",
  ["assembleDebug", "--no-daemon", "--max-workers=1"],
  {
    cwd: "android",
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      JAVA_TOOL_OPTIONS: process.env.JAVA_TOOL_OPTIONS ?? "-Xmx512m -XX:MaxMetaspaceSize=256m",
    },
  },
);
process.exit(result.status ?? 1);
