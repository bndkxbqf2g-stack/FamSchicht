const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';

let tesseractPromise;

export async function recognizeRosterImages(files, onProgress = () => {}) {
  if (!files?.length) throw new Error('Bitte wähle mindestens ein Planfoto aus.');
  const tesseract = await loadTesseract();
  const worker = await tesseract.createWorker('deu', 1, {
    logger: message => onProgress(message),
  });
  const pages = [];

  try {
    for (let index = 0; index < files.length; index += 1) {
      onProgress({status:'recognizing', page:index + 1, pages:files.length, progress:0});
      const image = await imageDimensions(files[index]);
      const {data} = await worker.recognize(files[index]);
      pages.push({
        width:image.width,
        height:image.height,
        text:data.text || '',
        words:Array.isArray(data.words) ? data.words : [],
      });
      onProgress({status:'page-complete', page:index + 1, pages:files.length, progress:1});
    }
    return pages;
  } finally {
    await worker.terminate();
  }
}

function loadTesseract() {
  if (globalThis.Tesseract?.createWorker) return Promise.resolve(globalThis.Tesseract);
  if (tesseractPromise) return tesseractPromise;

  tesseractPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TESSERACT_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => globalThis.Tesseract?.createWorker
      ? resolve(globalThis.Tesseract)
      : reject(new Error('Die OCR-Komponente konnte nicht gestartet werden.'));
    script.onerror = () => reject(new Error('OCR konnte nicht geladen werden. Bitte Internetverbindung prüfen und erneut versuchen.'));
    document.head.append(script);
  }).catch(error => {
    tesseractPromise = null;
    throw error;
  });

  return tesseractPromise;
}

async function imageDimensions(file) {
  if (globalThis.createImageBitmap) {
    const bitmap = await createImageBitmap(file);
    const dimensions = {width:bitmap.width, height:bitmap.height};
    bitmap.close();
    return dimensions;
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {width:image.naturalWidth, height:image.naturalHeight};
  } finally {
    URL.revokeObjectURL(url);
  }
}
