const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';
const OCR_OUTPUT = {blocks:true};

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
      const image = await loadImage(files[index]);
      try {
        const {data} = await worker.recognize(image.source, {}, OCR_OUTPUT);
        const words = wordsFromOcr(data);
        const alternatives = [];
        if (countServiceCodeWords(words) < 18) {
          const enhanced = makeEnhancedCanvas(image.source, image.width, image.height);
          let nameCanvas;
          let gridCanvas;
          try {
            for (const pageMode of ['11', '6']) {
              onProgress({status:'enhancing', page:index + 1, pages:files.length, progress:0});
              await worker.setParameters({tessedit_pageseg_mode:pageMode});
              const result = await worker.recognize(enhanced.canvas, {}, OCR_OUTPUT);
              alternatives.push({text:result.data.text || '', words:wordsFromOcr(result.data)});
            }

            nameCanvas = makeEnhancedCanvas(image.source, image.width, image.height, {
              x:image.width * 0.025, y:image.height * 0.08,
              regionWidth:image.width * 0.165, regionHeight:image.height * 0.8,
              scaleFactor:4,
            });
            gridCanvas = makeEnhancedCanvas(image.source, image.width, image.height, {
              x:image.width * 0.17, y:image.height * 0.08,
              regionWidth:image.width * 0.68, regionHeight:image.height * 0.8,
              scaleFactor:4,
            });
            await worker.setParameters({tessedit_pageseg_mode:'11'});
            const nameResult = await worker.recognize(nameCanvas.canvas, {}, OCR_OUTPUT);
            await worker.setParameters({tessedit_pageseg_mode:'6'});
            const gridResult = await worker.recognize(gridCanvas.canvas, {}, OCR_OUTPUT);
            alternatives.push({
              text:`${nameResult.data.text || ''} ${gridResult.data.text || ''}`.trim(),
              words:[
                ...mapCropWords(wordsFromOcr(nameResult.data), nameCanvas),
                ...mapCropWords(wordsFromOcr(gridResult.data), gridCanvas),
              ],
            });
          } finally {
            disposeCanvas(enhanced.canvas);
            if (nameCanvas) disposeCanvas(nameCanvas.canvas);
            if (gridCanvas) disposeCanvas(gridCanvas.canvas);
            await worker.setParameters({tessedit_pageseg_mode:'3'});
          }
        }
        pages.push({
          width:image.width,
          height:image.height,
          text:data.text || '',
          words,
          alternatives,
        });
      } finally {
        image.dispose();
      }
      onProgress({status:'page-complete', page:index + 1, pages:files.length, progress:1});
    }
    return pages;
  } finally {
    await worker.terminate();
  }
}

function wordsFromOcr(data) {
  if (Array.isArray(data?.words)) return data.words;
  return (data?.blocks || []).flatMap(block =>
    (block.paragraphs || []).flatMap(paragraph =>
      (paragraph.lines || []).flatMap(line => line.words || [])));
}

function countServiceCodeWords(words) {
  return (words || []).filter(word => /^(?:F1|FL|FI|S1|SI|N5|NS|NX|Z1|ZI)$/i.test(String(word?.text || '').trim())).length;
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

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Das Foto konnte nicht gelesen werden.'));
      if (image.complete && image.naturalWidth) resolve();
    });
    return {
      source:image,
      width:image.naturalWidth,
      height:image.naturalHeight,
      dispose:() => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function makeEnhancedCanvas(source, width, height, region = {}) {
  const x = region.x || 0;
  const y = region.y || 0;
  const regionWidth = region.regionWidth || width;
  const regionHeight = region.regionHeight || height;
  const scale = Math.min(region.scaleFactor || 3, 4096 / Math.max(regionWidth, regionHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(regionWidth * scale);
  canvas.height = Math.round(regionHeight * scale);
  const context = canvas.getContext('2d', {willReadFrequently:true});
  if (!context) throw new Error('Das Foto konnte für die Texterkennung nicht vorbereitet werden.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, x, y, regionWidth, regionHeight, 0, 0, canvas.width, canvas.height);

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const histogram = new Uint32Array(256);
  for (let index = 0; index < image.data.length; index += 4) {
    const gray = Math.round(image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114);
    histogram[gray] += 1;
  }
  const low = histogramPercentile(histogram, image.data.length / 4, 0.01);
  const high = histogramPercentile(histogram, image.data.length / 4, 0.99);
  const range = Math.max(1, high - low);
  for (let index = 0; index < image.data.length; index += 4) {
    const gray = Math.round(image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114);
    const contrast = Math.max(0, Math.min(255, Math.round((gray - low) * 255 / range)));
    const value = contrast;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
  }
  context.putImageData(image, 0, 0);
  return {canvas, x, y, scale};
}

function mapCropWords(words, crop) {
  return Array.isArray(words) ? words.filter(word => word?.bbox).map(word => ({
    ...word,
    bbox:{
      x0:crop.x + word.bbox.x0 / crop.scale,
      x1:crop.x + word.bbox.x1 / crop.scale,
      y0:crop.y + word.bbox.y0 / crop.scale,
      y1:crop.y + word.bbox.y1 / crop.scale,
    },
  })) : [];
}

function disposeCanvas(canvas) {
  canvas.width = 0;
  canvas.height = 0;
}

function histogramPercentile(histogram, total, percentile) {
  const target = total * percentile;
  let count = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    count += histogram[value];
    if (count >= target) return value;
  }
  return 255;
}
