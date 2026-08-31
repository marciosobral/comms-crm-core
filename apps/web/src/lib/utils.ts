import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge doesn't know about the custom `--text-*` font-size tokens
// defined in `@theme` (globals.css), so it falls back to classifying
// `text-{token}` classes (e.g. `text-eyebrow`, `text-small`) as text-color
// utilities. That makes them conflict with real color utilities like
// `text-muted`, silently dropping the font-size class when both appear in
// the same className string. Registering the tokens here fixes that.
const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: ["display", "h2", "h3", "body", "body-medium", "small", "caption", "eyebrow"],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}
