/** Prepare images for browser-only Branding storage. */
export const IMAGE_MAX_INPUT_BYTES = 10 * 1024 * 1024;
const IMAGE_TARGET_BYTES = 350 * 1024;
export const IMAGE_MAX_SAVED_BYTES = 1024 * 1024;
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
  | "cropSize"
  | "fileRead"
  | "fileOutputSize"
  | "aborted";
export class ImageUploadError extends Error {
  constructor(public readonly code: ImageUploadErrorCode) {
    super(code);
    this.name = "ImageUploadError";
  }
}
interface ImageOptions {
  minimumSize?: { width: number; height: number };
  maxDimension?: number;
  optimize?: boolean;
  signal?: AbortSignal;
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
    // Store result and error separately so the catch block only captures
    // unexpected decoder failures — Qodana flags re-throwing inside catch.
    let bitmap: ImageBitmap | undefined;
    let bitmapError: unknown;
    try {
      // Browser applies JPEG EXIF orientation when drawing to canvas.
      bitmap = await globalThis.createImageBitmap(file, {
        imageOrientation: "from-image",
      });
    } catch (error) {
      bitmapError = error;
      checkAbort(signal);
      // Some browser decoders do not accept SVG via createImageBitmap.
    }
    if (!bitmapError && bitmap) {
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
function encodeImage(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob?.size && blob.type === type ? blob : null),
      type,
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
        result.startsWith(`data:${blob.type};base64,`)
      )
        resolve(result);
      else reject(new ImageUploadError("fileRead"));
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
async function shrinkImage(
  file: File,
  decoded: DecodedImage,
  { maxDimension = 2560, minimumSize, signal }: ImageOptions,
): Promise<Blob> {
  const { width, height } = fitImageDimensions(
    decoded.width,
    decoded.height,
    maxDimension,
    maxDimension,
  );
  const minScale = minimumSize
    ? Math.max(minimumSize.width / width, minimumSize.height / height)
    : 0.18;
  if (minScale > 1) return file;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return file;

  let smallest: Blob = file;
  try {
    for (let scale = 1; ; scale = Math.max(minScale, scale * 0.75)) {
      checkAbort(signal);
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.imageSmoothingQuality = "high";
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
      for (const quality of file.type === "image/jpeg"
        ? [0.86, 0.72, 0.6]
        : [1]) {
        checkAbort(signal);
        const candidate = await encodeImage(canvas, file.type, quality);
        checkAbort(signal);
        if (!candidate) return smallest;
        if (candidate.size < smallest.size) smallest = candidate;
        if (smallest.size <= IMAGE_TARGET_BYTES) return smallest;
      }
      if (scale === minScale) return smallest;
    }
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** Validate before saving, and keep the original bytes unless optimization helps. */
export async function prepareBrandingImage(
  file: File,
  { minimumSize, maxDimension, optimize = true, signal }: ImageOptions = {},
) {
  const issue = imageUploadError(file);
  if (issue) throw new ImageUploadError(issue);
  const decoded = await decodeImage(file, signal);
  try {
    checkAbort(signal);
    if (decoded.width < 1 || decoded.height < 1)
      throw new ImageUploadError("fileRead");
    if (
      minimumSize &&
      (decoded.width < minimumSize.width || decoded.height < minimumSize.height)
    )
      throw new ImageUploadError("cropSize");

    const shouldOptimize =
      optimize &&
      file.size > IMAGE_TARGET_BYTES &&
      (file.type === "image/jpeg" || file.type === "image/png");
    const saved = shouldOptimize
      ? await shrinkImage(file, decoded, { maxDimension, minimumSize, signal })
      : file;
    if (saved.size > IMAGE_MAX_SAVED_BYTES)
      throw new ImageUploadError("fileOutputSize");

    return {
      name: file.name.slice(0, 255),
      url: await blobDataUrl(saved, signal),
    };
  } finally {
    decoded.close();
  }
}
