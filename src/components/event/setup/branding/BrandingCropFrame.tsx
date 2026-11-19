import Image from "next/image";
import { useRef, type KeyboardEvent } from "react";
import styles from "./BrandingDialog.module.css";

export type CropPosition = { x: number; y: number };
interface Props {
  ratio: number;
  src?: string;
  name?: string;
  position: CropPosition;
  onPosition: (position: CropPosition, axis: keyof CropPosition) => void;
  disabled: boolean;
  zoom?: number;
  keyboardLabel?: string;
}
const clamp = (value: number) => Math.max(0, Math.min(100, value));

export default function BrandingCropFrame({
  ratio,
  src,
  name,
  position,
  onPosition,
  disabled,
  zoom = 1,
  keyboardLabel,
}: Props) {
  const drag = useRef<{
    start: CropPosition;
    overflow: CropPosition;
    position: CropPosition;
  } | null>(null);
  const origin = `${position.x}% ${position.y}%`;
  function moveWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || !keyboardLabel) return;
    const step = event.shiftKey ? 10 : 1;
    const next = { ...position };
    switch (event.key) {
      case "ArrowLeft":
        next.x = clamp(next.x - step);
        break;
      case "ArrowRight":
        next.x = clamp(next.x + step);
        break;
      case "ArrowUp":
        next.y = clamp(next.y - step);
        break;
      case "ArrowDown":
        next.y = clamp(next.y + step);
        break;
      default:
        return;
    }
    event.preventDefault();
    onPosition(
      next,
      event.key === "ArrowLeft" || event.key === "ArrowRight" ? "x" : "y",
    );
  }
  return (
    <div
      className={styles.cropFrame}
      role={keyboardLabel ? "group" : undefined}
      aria-label={keyboardLabel}
      tabIndex={keyboardLabel && !disabled ? 0 : undefined}
      onKeyDown={moveWithKeyboard}
      style={{
        aspectRatio: ratio,
        width: `min(100cqw, calc((100cqh - 32px) * ${ratio}), ${352 * ratio}px)`,
      }}
      onPointerDown={(event) => {
        const frame = event.currentTarget;
        const image = frame.querySelector("img");
        if (
          disabled ||
          !image?.naturalWidth ||
          !event.isPrimary ||
          event.button !== 0
        )
          return;
        const scale =
          Math.max(
            frame.clientWidth / image.naturalWidth,
            frame.clientHeight / image.naturalHeight,
          ) * zoom;
        drag.current = {
          start: { x: event.clientX, y: event.clientY },
          overflow: {
            x: image.naturalWidth * scale - frame.clientWidth,
            y: image.naturalHeight * scale - frame.clientHeight,
          },
          position,
        };
        frame.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (
          !drag.current ||
          !event.currentTarget.hasPointerCapture(event.pointerId)
        )
          return;
        const { start, overflow, position } = drag.current;
        onPosition(
          {
            x:
              overflow.x < 0.5
                ? position.x
                : clamp(
                    position.x - (100 * (event.clientX - start.x)) / overflow.x,
                  ),
            y:
              overflow.y < 0.5
                ? position.y
                : clamp(
                    position.y - (100 * (event.clientY - start.y)) / overflow.y,
                  ),
          },
          overflow.x > overflow.y ? "x" : "y",
        );
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
    >
      {src && (
        <Image
          unoptimized
          fill
          draggable={false}
          src={src}
          alt={name ?? ""}
          className="object-cover"
          style={{
            objectPosition: origin,
            transformOrigin: origin,
            transform: `scale(${zoom})`,
          }}
        />
      )}
    </div>
  );
}
