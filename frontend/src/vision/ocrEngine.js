let textDetectorPromise;

function getTextDetector() {
  if (!('TextDetector' in window)) {
    return Promise.resolve(null);
  }
  if (!textDetectorPromise) {
    textDetectorPromise = Promise.resolve(new window.TextDetector()).catch(() => null);
  }
  return textDetectorPromise;
}

export async function inspectVisibleText(dataUrl) {
  const detector = await getTextDetector();
  if (!detector) {
    return {
      status: 'Visual OCR standby',
      text: [],
      message: 'Native OCR is not available in this Windows runtime.'
    };
  }

  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const results = await detector.detect(bitmap);
    bitmap.close?.();
    const text = results
      .map((item) => item.rawValue || '')
      .filter(Boolean)
      .slice(0, 12);
    return {
      status: text.length ? 'OCR active' : 'OCR active, no text found',
      text,
      message: text.length ? `${text.length} chart labels detected.` : 'No readable labels detected in the chart area.'
    };
  } catch (error) {
    return {
      status: 'OCR retrying',
      text: [],
      message: error.message || 'OCR failed and will retry automatically.'
    };
  }
}
