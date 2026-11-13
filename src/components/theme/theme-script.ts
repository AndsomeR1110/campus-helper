/** localStorage key for the theme preference ("light" | "dark"; absent = follow the system). */
export const THEME_STORAGE_KEY = "theme";

/**
 * Runs synchronously in <head> before first paint (see Next.js guide
 * "Preventing flash before hydration"). Sets `data-theme` on <html> from the
 * saved preference or the system setting, follows system changes, and exposes
 * `window.__applyTheme()` for ThemeSwitcher.
 */
export const THEME_SCRIPT = `(function(){var d=document.documentElement,m=window.matchMedia("(prefers-color-scheme: dark)");function a(){var p=null;try{p=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}d.setAttribute("data-theme",p==="dark"||(p!=="light"&&m.matches)?"dark":"light")}a();window.__applyTheme=a;try{m.addEventListener("change",a)}catch(e){}})()`;
