import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const MAX_PREVIEW_EDGE_PX = 1_440;
const MAX_PREVIEW_SCALE = 2;

export type PdfPreview = {
  bytes: Uint8Array;
  contentType: "image/png";
  width: number;
  height: number;
  pageCount: number;
};

/**
 * Renders the first PDF page locally. This package intentionally has no
 * database, object-storage, or authorization dependency; callers decide how
 * the generated image is stored and who may access it.
 */
export async function renderPdfFirstPagePreview(
  source: Uint8Array,
): Promise<PdfPreview> {
  // PDF.js may transfer ownership of its input to a worker. Copying keeps the
  // caller's fetched object bytes intact for the rest of its workflow.
  const data = new Uint8Array(source);
  const loadingTask = getDocument({
    data,
    isImageDecoderSupported: false,
    maxImageSize: 16_000_000,
    stopAtErrors: true,
    useSystemFonts: true,
    useWasm: false,
  });

  try {
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(
      MAX_PREVIEW_SCALE,
      MAX_PREVIEW_EDGE_PX /
        Math.max(unscaledViewport.width, unscaledViewport.height),
    );
    const viewport = page.getViewport({ scale });
    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    await page.render({
      canvas: null,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
      background: "#ffffff",
    }).promise;

    return {
      bytes: new Uint8Array(canvas.toBuffer("image/png")),
      contentType: "image/png",
      width,
      height,
      pageCount: pdf.numPages,
    };
  } finally {
    await loadingTask.destroy();
  }
}
