import Image from "next/image";

type BrandingIconName =
  | "photograph"
  | "document-text"
  | "choose-banner"
  | "open-branding"
  | "upload"
  | "close"
  | "palette"
  | "identity"
  | "organizers"
  | "add-channel";

export default function BrandingIcon({
  name,
  size = 20,
}: {
  name: BrandingIconName;
  size?: number;
}) {
  return (
    <Image
      alt=""
      src={`/images/event-branding/${name}.svg`}
      width={size}
      height={size}
      className="shrink-0 dark:brightness-0 dark:invert"
    />
  );
}
