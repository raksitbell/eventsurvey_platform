export type BrandingColorKey = "primary" | "secondary" | "accent";
export type BrandingMediaKind = "logo" | "banner";
export interface BrandingImage {
  name: string;
  url: string;
}
export interface EventBranding {
  layout?: "portrait" | "square" | "landscape";
  organizer?: string;
  tagline?: string;
  identity?: "icon" | "wordmark";
  wordmark?: BrandingImage | null;
  backgroundMode?: "solid" | "gradient" | "blur";
  gradientEnd?: string;
  gradientAngle?: 0 | 90;
  footerColor?: string;
  transparentChrome?: boolean;
  channels?: { platform: string; url: string }[];
  primary: string;
  secondary: string;
  accent: string;
  logo: BrandingImage | null;
  banner: BrandingImage | null;
}
