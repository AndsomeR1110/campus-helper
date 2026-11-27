import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import ts from "typescript";
for (const [sourcePath, asset] of [
  ["src/features/shuttle/school-adapter.ts", "shuttle-adapter.js"],
  ["src/features/school-timetable/school-adapter.ts", "school-timetable.js"],
]) {
  const source = readFileSync(sourcePath, "utf8");
  const output = ts
    .transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
    })
    .outputText.replace(/^export /gm, "");
  mkdirSync("android/app/src/main/assets", { recursive: true });
  writeFileSync(`android/app/src/main/assets/${asset}`, output);
}
