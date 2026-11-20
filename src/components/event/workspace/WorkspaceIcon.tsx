import Image from "next/image";

interface WorkspaceIconProps {
  name: string;
  size: number;
  directional?: boolean;
}

export default function WorkspaceIcon({
  name,
  size,
  directional = false,
}: WorkspaceIconProps) {
  return (
    <Image
      src={`/images/event-workspace/${name}.svg`}
      width={size}
      height={size}
      alt=""
      className={directional ? "shrink-0 rtl:-scale-x-100" : "shrink-0"}
    />
  );
}
