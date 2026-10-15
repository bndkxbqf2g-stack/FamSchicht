import {extractBestRosterPage} from './shift-roster-import.js';

const PDF_JS_SOURCES = [
  {
    script: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  },
  {
    script: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
    worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  },
];

let pdfJsPromise;

function getPdfJsGlobal() {
  return [
    globalThis.pdfjsLib,
    globalThis['pdfjs-dist/build/pdf'],
  ].find(candidate => typeof candidate?.getDocument === 'function');
}

export function isPdfRosterFile(file) {
  const type = String(file?.type || '').toLowerCase();
  const name = String(file?.name || '').toLowerCase();
  return type === 'application/pdf' || /\.pdf$/.test(name);
}

export function needsRosterRotation(width, height) {
  return Number(width) > 0 && Number(height) > 0 && Number(width) < Number(height);
}

export async function loadPdfRosterPages(file, onProgress = () => {}) {
  const pdfjs = await loadPdfJs();
  const data = await readFileBytes(file);
  let pdfDocument;
  try {
    pdfDocument = await pdfjs.getDocument({data}).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      onProgress({
        status: 'reading-pdf',
        page: pageNumber,
        pages: pdfDocument.numPages,
        progress: (pageNumber - 1) / pdfDocument.numPages,
        label: 'PDF-Seite',
      });
      const page = await pdfDocument.getPage(pageNumber);
      const textPage = await extractPdfTextPage(page, pdfjs);
      pages.push({kind: 'pdf', page, textPage});
    }
    return {
      pages,
      dispose: () => pdfDocument.destroy(),
    };
  } catch (error) {
    if (pdfDocument) await pdfDocument.destroy().catch(() => {});
    throw new Error('Die PDF-Datei konnte nicht gelesen werden.');
  }
}

export function isUsablePdfTextPage(page, period) {
  return Boolean(
    page?.textPage?.text &&
    extractBestRosterPage(page.textPage, period).length,
  );
}

export async function renderPdfRosterPage(task, onProgress = () => {}) {
  const baseViewport = task.page.getViewport({scale: 1});
  const scale = Math.min(2.5, 4096 / Math.max(1, baseViewport.width, baseViewport.height));
  const viewport = task.page.getViewport({scale});
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const context = canvas.getContext('2d', {willReadFrequently: true});
  if (!context) {
    disposeCanvas(canvas);
    throw new Error('Die PDF-Seite konnte für die Texterkennung nicht vorbereitet werden.');
  }
  onProgress({status: 'rendering-pdf', label: 'PDF-Seite'});
  try {
    await task.page.render({canvasContext: context, viewport}).promise;
    if (needsRosterRotation(baseViewport.width, baseViewport.height)) {
      const rotatedCanvas = rotateCanvasCounterClockwise(canvas);
      disposeCanvas(canvas);
      return {
        source: rotatedCanvas,
        width: rotatedCanvas.width,
        height: rotatedCanvas.height,
        dispose: () => disposeCanvas(rotatedCanvas),
      };
    }
    return {
      source: canvas,
      width: canvas.width,
      height: canvas.height,
      dispose: () => disposeCanvas(canvas),
    };
  } catch (error) {
    disposeCanvas(canvas);
    throw new Error('Die PDF-Seite konnte nicht dargestellt werden.');
  }
}

async function extractPdfTextPage(page, pdfjs) {
  const viewport = page.getViewport({scale: 1});
  try {
    const content = await page.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    });
    const words = (content.items || []).flatMap(item => pdfTextItemWords(item, viewport, pdfjs));
    return {
      width: viewport.width,
      height: viewport.height,
      text: words.map(word => word.text).join(' ').trim(),
      words,
      alternatives: [],
    };
  } catch (error) {
    return {
      width: viewport.width,
      height: viewport.height,
      text: '',
      words: [],
      alternatives: [],
    };
  }
}

function pdfTextItemWords(item, viewport, pdfjs) {
  const text = String(item?.str || '').trim();
  if (!text) return [];
  const transform = pdfjs.Util.transform(viewport.transform, item.transform);
  const x = Number(transform[4]) || 0;
  const baseline = Number(transform[5]) || 0;
  const height = Math.max(1, Math.abs(Number(transform[3])) || Number(item.height) || 1);
  const width = Math.max(1, Math.abs(Number(item.width)) || text.length * height * 0.5);
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return [{text: parts[0], bbox: {x0: x, y0: baseline - height, x1: x + width, y1: baseline}}];
  }
  const characters = parts.reduce((sum, part) => sum + part.length, 0) + parts.length - 1;
  let offset = 0;
  return parts.map(part => {
    const partWidth = width * part.length / characters;
    const word = {
      text: part,
      bbox: {x0: x + width * offset / characters, y0: baseline - height, x1: x + width * (offset + part.length) / characters, y1: baseline},
    };
    offset += part.length + 1;
    return word;
  });
}

async function readFileBytes(file) {
  try {
    const buffer = await file?.arrayBuffer?.();
    if (buffer?.byteLength) return new Uint8Array(buffer);
  } catch (error) {
    // FileReader below is the compatibility fallback for older WebViews.
  }
  if (typeof FileReader === 'undefined') throw new Error('Die PDF-Datei konnte nicht gelesen werden.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result?.byteLength) resolve(new Uint8Array(reader.result));
      else reject(new Error('Die PDF-Datei konnte nicht gelesen werden.'));
    };
    reader.onerror = () => reject(new Error('Die PDF-Datei konnte nicht gelesen werden.'));
    reader.readAsArrayBuffer(file);
  });
}

function loadPdfJs() {
  const existingPdfJs = getPdfJsGlobal();
  if (existingPdfJs) return Promise.resolve(existingPdfJs);
  if (pdfJsPromise) return pdfJsPromise;

  pdfJsPromise = (async () => {
    for (const source of PDF_JS_SOURCES) {
      try {
        await loadScript(source.script);
        const pdfjs = getPdfJsGlobal();
        if (!pdfjs) throw new Error('PDF-Komponente konnte nicht gestartet werden.');
        if (pdfjs.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = source.worker;
        }
        return pdfjs;
      } catch (error) {
        // Try the second CDN before surfacing a safe, provider-neutral message.
      }
    }
    throw new Error('Die PDF-Komponente konnte nicht geladen werden. Bitte Internetverbindung prüfen und erneut versuchen.');
  })().catch(error => {
    pdfJsPromise = null;
    throw error;
  });

  return pdfJsPromise;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-famschicht-pdfjs="${src}"]`);
    if (existing) {
      if (getPdfJsGlobal()) {
        resolve();
        return;
      }
      existing.remove();
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.famschichtPdfjs = src;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error('PDF-Komponente konnte nicht geladen werden.'));
    };
    document.head.append(script);
  });
}

function rotateCanvasCounterClockwise(source) {
  const canvas = document.createElement('canvas');
  canvas.width = source.height;
  canvas.height = source.width;
  const context = canvas.getContext('2d');
  if (!context) {
    disposeCanvas(canvas);
    throw new Error('Die PDF-Seite konnte für die Texterkennung nicht ausgerichtet werden.');
  }
  context.translate(0, canvas.height);
  context.rotate(-Math.PI / 2);
  context.drawImage(source, 0, 0);
  return canvas;
}

function disposeCanvas(canvas) {
  canvas.width = 0;
  canvas.height = 0;
}
