import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about our custom font-size tokens, otherwise it treats
// `text-title` (a size) and `text-text-muted` (a color) as the same group and
// drops one of them.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "title-lg", "title", "subtitle", "body", "body-sm", "caption"] },
      ],
    },
  },
});

/** Merge conditional class names and resolve Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
