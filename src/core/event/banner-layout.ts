export const bannerLayouts = {
  portrait: { ratio: "3:4", width: 900, height: 1200 },
  square: { ratio: "1:1", width: 1080, height: 1080 },
  landscape: { ratio: "16:9", width: 1920, height: 1080 },
} as const;

export type BannerLayout = keyof typeof bannerLayouts;

export function bannerObjectPosition(position?: number) {
  return position === undefined ? undefined : `${position}% ${position}%`;
}
