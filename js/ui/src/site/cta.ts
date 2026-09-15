/** The site's shared layout width and button styles (used by every page and the offering cards). */
export const container = 'mx-auto w-full max-w-6xl px-5 sm:px-8';
const cta = 'inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
export const primaryCta = `${cta} bg-primary text-primary-foreground shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-glow)_40%,transparent),0_8px_30px_-10px_color-mix(in_srgb,var(--color-glow)_70%,transparent)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-glow)_60%,transparent),0_14px_40px_-10px_color-mix(in_srgb,var(--color-glow)_80%,transparent)]`;
export const secondaryCta = `${cta} glass hover:-translate-y-0.5`;
