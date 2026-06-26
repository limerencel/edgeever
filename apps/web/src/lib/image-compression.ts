import type { ParsedFrame } from "gifuct-js";
import type { WebPAnimationFrame } from "wasm-webp";

const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif"]);
const COMPRESSED_IMAGE_TYPE = "image/webp";
const COMPRESSED_IMAGE_EXTENSION = ".webp";
const MAX_COMPRESSED_IMAGE_EDGE = 2560;
const IMAGE_COMPRESSION_QUALITY = 0.82;
const ANIMATED_IMAGE_COMPRESSION_QUALITY = 76;
const MAX_ANIMATED_GIF_FRAMES = 320;
const MIN_ANIMATION_FRAME_DURATION_MS = 20;

export type ImageCompressionResult = {
  file: File;
  compressed: boolean;
  originalSize: number;
  outputSize: number;
};

export const compressImageForUpload = async (file: File): Promise<ImageCompressionResult> => {
  if (!COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
    return unchanged(file);
  }

  try {
    if (file.type === "image/gif") {
      return compressAnimatedGifForUpload(file);
    }

    const image = await loadImage(file);
    const width = image.naturalWidth;
    const height = image.naturalHeight;

    if (width <= 0 || height <= 0) {
      return unchanged(file);
    }

    const scale = Math.min(1, MAX_COMPRESSED_IMAGE_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
      return unchanged(file);
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas, COMPRESSED_IMAGE_TYPE, IMAGE_COMPRESSION_QUALITY);

    if (!blob || blob.type !== COMPRESSED_IMAGE_TYPE || blob.size >= file.size) {
      return unchanged(file);
    }

    return {
      file: new File([blob], toCompressedFilename(file.name), {
        type: COMPRESSED_IMAGE_TYPE,
        lastModified: file.lastModified,
      }),
      compressed: true,
      originalSize: file.size,
      outputSize: blob.size,
    };
  } catch {
    return unchanged(file);
  }
};

const compressAnimatedGifForUpload = async (file: File): Promise<ImageCompressionResult> => {
  const [{ parseGIF, decompressFrames }, { encodeAnimation }] = await Promise.all([
    import("gifuct-js"),
    import("wasm-webp"),
  ]);
  const parsedGif = parseGIF(await file.arrayBuffer());
  const frames = decompressFrames(parsedGif, true);

  if (frames.length === 0 || frames.length > MAX_ANIMATED_GIF_FRAMES) {
    return unchanged(file);
  }

  const sourceWidth = parsedGif.lsd.width;
  const sourceHeight = parsedGif.lsd.height;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return unchanged(file);
  }

  const scale = Math.min(1, MAX_COMPRESSED_IMAGE_EDGE / Math.max(sourceWidth, sourceHeight));
  const outputWidth = Math.max(1, Math.round(sourceWidth * scale));
  const outputHeight = Math.max(1, Math.round(sourceHeight * scale));
  const animationFrames = renderGifFramesForWebp(frames, sourceWidth, sourceHeight, outputWidth, outputHeight);

  if (animationFrames.length === 0) {
    return unchanged(file);
  }

  const data = await encodeAnimation(outputWidth, outputHeight, true, animationFrames);

  if (!data || data.byteLength >= file.size) {
    return unchanged(file);
  }

  const blob = new Blob([toArrayBuffer(data)], { type: COMPRESSED_IMAGE_TYPE });

  return {
    file: new File([blob], toCompressedFilename(file.name), {
      type: COMPRESSED_IMAGE_TYPE,
      lastModified: file.lastModified,
    }),
    compressed: true,
    originalSize: file.size,
    outputSize: blob.size,
  };
};

const renderGifFramesForWebp = (
  frames: ParsedFrame[],
  sourceWidth: number,
  sourceHeight: number,
  outputWidth: number,
  outputHeight: number
): WebPAnimationFrame[] => {
  const gifCanvas = document.createElement("canvas");
  gifCanvas.width = sourceWidth;
  gifCanvas.height = sourceHeight;
  const gifContext = gifCanvas.getContext("2d", { alpha: true });
  const patchCanvas = document.createElement("canvas");
  const patchContext = patchCanvas.getContext("2d", { alpha: true });
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const outputContext = outputCanvas.getContext("2d", { alpha: true });

  if (!gifContext || !patchContext || !outputContext) {
    return [];
  }

  const outputFrames: WebPAnimationFrame[] = [];

  for (const frame of frames) {
    const previousFrame =
      frame.disposalType === 3 ? gifContext.getImageData(0, 0, sourceWidth, sourceHeight) : null;

    drawGifPatch(frame, patchCanvas, patchContext, gifContext);

    outputContext.clearRect(0, 0, outputWidth, outputHeight);
    outputContext.drawImage(gifCanvas, 0, 0, outputWidth, outputHeight);

    const imageData = outputContext.getImageData(0, 0, outputWidth, outputHeight);
    outputFrames.push({
      data: new Uint8Array(imageData.data),
      duration: Math.max(frame.delay || 100, MIN_ANIMATION_FRAME_DURATION_MS),
      config: {
        lossless: 0,
        quality: ANIMATED_IMAGE_COMPRESSION_QUALITY,
      },
    });

    if (frame.disposalType === 2) {
      gifContext.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
    } else if (previousFrame) {
      gifContext.putImageData(previousFrame, 0, 0);
    }
  }

  return outputFrames;
};

const drawGifPatch = (
  frame: ParsedFrame,
  patchCanvas: HTMLCanvasElement,
  patchContext: CanvasRenderingContext2D,
  gifContext: CanvasRenderingContext2D
) => {
  const { dims } = frame;

  patchCanvas.width = dims.width;
  patchCanvas.height = dims.height;
  patchContext.clearRect(0, 0, dims.width, dims.height);
  patchContext.putImageData(new ImageData(new Uint8ClampedArray(toArrayBuffer(frame.patch)), dims.width, dims.height), 0, 0);
  gifContext.drawImage(patchCanvas, dims.left, dims.top);
};

const toArrayBuffer = (bytes: Uint8Array | Uint8ClampedArray) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

const unchanged = (file: File): ImageCompressionResult => ({
  file,
  compressed: false,
  originalSize: file.size,
  outputSize: file.size,
});

const loadImage = async (file: File) => {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";

    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Image cannot be decoded."));
    });

    image.src = url;
    await loaded;

    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });

const toCompressedFilename = (filename: string) => {
  const trimmed = filename.trim();

  if (!trimmed) {
    return `image${COMPRESSED_IMAGE_EXTENSION}`;
  }

  return trimmed.replace(/\.[^.]+$/, "") + COMPRESSED_IMAGE_EXTENSION;
};
