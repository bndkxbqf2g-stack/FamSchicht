import test from 'node:test';
import assert from 'node:assert/strict';
import {isPdfRosterFile, isUsablePdfTextPage} from '../src/shift-roster-pdf.js';
import {recognizeRosterImages} from '../src/shift-roster-ocr.js';

function word(text, x, y) {
  return {text, bbox:{x0:x - 8, x1:x + 8, y0:y - 5, y1:y + 5}};
}

test('recognizes PDF roster files by MIME type or extension', () => {
  assert.equal(isPdfRosterFile({name:'plan.pdf', type:'application/pdf'}), true);
  assert.equal(isPdfRosterFile({name:'plan', type:'application/pdf'}), true);
  assert.equal(isPdfRosterFile({name:'plan.pdf', type:''}), true);
  assert.equal(isPdfRosterFile({name:'plan.png', type:'image/png'}), false);
});

test('accepts a PDF text page when it maps safely to roster entries', () => {
  const textPage = {
    width:1280,
    height:960,
    text:'Dienstplan November 2026 Ada Beispiel F1',
    words:[
      word('Ada', 80, 160),
      word('Beispiel', 132, 160),
      word('F1', 256, 160),
    ],
  };
  assert.equal(isUsablePdfTextPage({textPage}, '2026-11'), true);
});

test('keeps a PDF page review-required when text cannot map a shift', () => {
  const textPage = {
    width:1280,
    height:960,
    text:'Dienstplan November 2026 Ada Beispiel',
    words:[word('Ada', 80, 160), word('Beispiel', 132, 160)],
  };
  assert.equal(isUsablePdfTextPage({textPage}, '2026-11'), false);
});

test('uses a readable PDF text layer without starting the OCR worker', async () => {
  const previousPdfjs = globalThis.pdfjsLib;
  const progress = [];
  const page = {
    getViewport: ({scale}) => ({width:1280 * scale, height:960 * scale, transform:[scale, 0, 0, scale, 0, 0]}),
    getTextContent: async () => ({items:[
      {str:'Dienstplan November 2026', transform:[1, 0, 0, 10, 400, 50], width:140, height:10},
      {str:'Ada', transform:[1, 0, 0, 10, 80, 165], width:30, height:10},
      {str:'Beispiel', transform:[1, 0, 0, 10, 132, 165], width:60, height:10},
      {str:'F1', transform:[1, 0, 0, 10, 256, 165], width:18, height:10},
    ]}),
    render: async () => { throw new Error('OCR fallback should not render a readable text page.'); },
  };
  globalThis.pdfjsLib = {
    Util: {transform: (_viewportTransform, itemTransform) => itemTransform},
    GlobalWorkerOptions: {},
    getDocument: () => ({promise: Promise.resolve({
      numPages:1,
      getPage: async () => page,
      destroy: async () => {},
    })}),
  };
  try {
    const result = await recognizeRosterImages([{
      name:'synthetic-roster.pdf',
      type:'application/pdf',
      size:1024,
      arrayBuffer: async () => new ArrayBuffer(16),
    }], message => progress.push(message));
    assert.equal(result.length, 1);
    assert.equal(result[0].text.includes('November'), true);
    assert.equal(progress.some(message => message.status === 'reading-pdf'), true);
    assert.equal(progress.some(message => message.status === 'recognizing'), false);
  } finally {
    if (previousPdfjs === undefined) delete globalThis.pdfjsLib;
    else globalThis.pdfjsLib = previousPdfjs;
  }
});
