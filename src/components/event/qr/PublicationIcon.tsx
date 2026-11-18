import Image from "next/image";

export default function PublicationIcon({
  name,
  size = 16,
  directional = false,
}: {
  name: string;
  size?: number;
  directional?: boolean;
}) {
  return (
    <Image
      src={`/images/event-publication/${name}.svg`}
      alt=""
      width={size}
      height={size}
      className={directional ? "shrink-0 rtl:-scale-x-100" : "shrink-0"}
    />
  );
}
