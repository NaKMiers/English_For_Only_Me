import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// The sticker radius roles from `globals.css` (`--radius-shell/panel/control/tag`).
// tailwind-merge only knows the t-shirt radius scale, so without this
// `cn('rounded-lg', 'rounded-control')` keeps BOTH classes and stylesheet order,
// not argument order, picks the corner. Add a role here when you add one there.
const twMerge = extendTailwindMerge({
  extend: { theme: { radius: ['shell', 'panel', 'control', 'tag'] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
