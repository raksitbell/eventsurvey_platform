/** Browser-only image conversion. No files or temporary object URLs are stored. */
export const IMAGE_MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const IMAGE_MAX_OUTPUT_BYTES = 350 * 1024;
export const IMAGE_UPLOAD_ACCEPT: Record<string, string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
  "image/gif": [".gif"],
  "image/bmp": [".bmp"],
  "image/svg+xml": [".svg"],
};
export type ImageUploadErrorCode =
  | "fileType"
  | "fileSize"
  | "fileRead"
  | "fileConvert"
  | "fileOutputSize"
  | "aborted";
export class ImageUploadError extends Error {
  constructor(public readonly code: ImageUploadErrorCode) {
    super(code);
    this.name = "ImageUploadError";
  }
}
export interface WebpImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxOutputBytes?: number;
  quality?: number;
  signal?: AbortSignal;
}
export interface ConvertedWebpImage {
  name: string;
  url: string;
  type: "image/webp";
  size: number;
  width: number;
  height: number;
}
export function imageUploadError(
  file: Pick<File, "size" | "type">,
): "fileType" | "fileSize" | null {
  if (!Object.hasOwn(IMAGE_UPLOAD_ACCEPT, file.type.toLowerCase()))
    return "fileType";
  return !Number.isFinite(file.size) ||
    file.size <= 0 ||
    file.size >= IMAGE_MAX_INPUT_BYTES
    ? "fileSize"
    : null;
}
export function fitImageDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
) {
  if (
    ![width, height, maxWidth, maxHeight].every(
      (v) => Number.isFinite(v) && v > 0,
    )
  )
    throw new ImageUploadError("fileRead");
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new ImageUploadError("aborted");
}
interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}
async function decodeImage(
  file: File,
  signal?: AbortSignal,
): Promise<DecodedImage> {
  checkAbort(signal);
  if (typeof globalThis.createImageBitmap === "function") {
    try {
      // Browser applies JPEG EXIF orientation; animated inputs use a still frame.
      const bitmap = await globalThis.createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      if (signal?.aborted) {
        bitmap.close();
        throw new ImageUploadError("aborted");
      }
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch (error) {
      if (error instanceof ImageUploadError) throw error;
      checkAbort(signal);
      // Some browser decoders do not accept SVG via createImageBitmap.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new globalThis.Image();
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        image.onload = null;
        image.onerror = null;
        signal?.removeEventListener("abort", abort);
      };
      const abort = () => {
        cleanup();
        image.src = "";
        reject(new ImageUploadError("aborted"));
      };
      image.onload = () => {
        cleanup();
        resolve();
      };
      image.onerror = () => {
        cleanup();
        reject(new ImageUploadError("fileRead"));
      };
      signal?.addEventListener("abort", abort, { once: true });
      image.src = url;
    });
    checkAbort(signal);
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => {
        image.src = "";
      },
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
function encodeWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Canvas may silently return PNG when WebP encoding is unsupported.
        if (!blob || !blob.size || blob.type !== "image/webp")
          reject(new ImageUploadError("fileConvert"));
        else resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}
function blobDataUrl(blob: Blob, signal?: AbortSignal): Promise<string> {
  checkAbort(signal);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const cleanup = () => {
      signal?.removeEventListener("abort", abort);
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
    };
    const abort = () => {
      cleanup();
      reader.abort();
      reject(new ImageUploadError("aborted"));
    };
    reader.onload = () => {
      const result = reader.result;
      cleanup();
      if (
        typeof result === "string" &&
        result.startsWith("data:image/webp;base64,")
      )
        resolve(result);
      else reject(new ImageUploadError("fileConvert"));
    };
    reader.onerror = () => {
      cleanup();
      reject(new ImageUploadError("fileRead"));
    };
    reader.onabort = () => {
      cleanup();
      reject(new ImageUploadError("aborted"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    try {
      reader.readAsDataURL(blob);
    } catch {
      cleanup();
      reject(new ImageUploadError("fileRead"));
    }
  });
}
/**
 * Convert a supported image <10 MiB to a bounded WebP data URL for LocalStorage.
 * Preserve aspect ratio/alpha; never upscale. Does not write storage itself.
 * Quality and then resolution are reduced if the encoded image exceeds its budget.
 */
export async function convertImageToWebp(
  file: File,
  options: WebpImageOptions = {},
): Promise<ConvertedWebpImage> {
  const issue = imageUploadError(file);
  if (issue) throw new ImageUploadError(issue);
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    maxOutputBytes = IMAGE_MAX_OUTPUT_BYTES,
    quality = 0.86,
    signal,
  } = options;
  if (
    ![maxWidth, maxHeight, maxOutputBytes].every(
      (v) => Number.isSafeInteger(v) && v > 0,
    ) ||
    !Number.isFinite(quality) ||
    quality <= 0 ||
    quality > 1
  )
    throw new RangeError("Invalid image conversion options");
  let decoded: DecodedImage | undefined;
  let canvas: HTMLCanvasElement | undefined;
  try {
    decoded = await decodeImage(file, signal);
    checkAbort(signal);
    let { width, height } = fitImageDimensions(
      decoded.width,
      decoded.height,
      maxWidth,
      maxHeight,
    );
    canvas = globalThis.document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new ImageUploadError("fileConvert");
    let currentQuality = quality;
    const minQuality = Math.min(0.6, quality);
    for (let attempt = 0; attempt < 16; attempt++) {
      checkAbort(signal);
      canvas.width = width;
      canvas.height = height;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(decoded.source, 0, 0, width, height);
      const blob = await encodeWebp(canvas, currentQuality);
      checkAbort(signal);
      if (blob.size > 0 && blob.size <= maxOutputBytes) {
        const url = await blobDataUrl(blob, signal);
        checkAbort(signal);
        const baseName = (file.name.replace(/\.[^.]+$/, "") || "image").slice(
          0,
          250,
        );
        return {
          name: `${baseName}.webp`,
          url,
          type: "image/webp",
          size: blob.size,
          width,
          height,
        };
      }
      if (currentQuality > minQuality)
        currentQuality = Math.max(minQuality, currentQuality - 0.12);
      else {
        width = Math.max(1, Math.floor(width * 0.75));
        height = Math.max(1, Math.floor(height * 0.75));
        currentQuality = quality;
      }
    }
    throw new ImageUploadError("fileOutputSize");
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError("fileConvert");
  } finally {
    decoded?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
