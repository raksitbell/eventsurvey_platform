export type BrandingColorKey = "primary" | "secondary" | "accent";
export type BrandingMediaKind = "logo" | "banner";
export interface BrandingImage {
  name: string;
  url: string;
}
export interface EventBranding {
  primary: string;
  secondary: string;
  accent: string;
  logo: BrandingImage | null;
  banner: BrandingImage | null;
}
