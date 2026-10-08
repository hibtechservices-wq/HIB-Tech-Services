import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

/**
 * Downloads any DOM element as a crisp, high-resolution PDF file directly.
 * Fully supports modern CSS color functions (oklch, color-mix) from Tailwind CSS v4,
 * custom table borders, fonts, and multi-page pagination.
 */
export async function downloadElementAsPDF(
  element: HTMLElement | null,
  filename: string = 'document.pdf',
  options: {
    format?: 'a4' | 'letter' | [number, number];
    orientation?: 'portrait' | 'landscape';
    margin?: number;
    scale?: number;
    fitToSinglePage?: boolean;
  } = {}
): Promise<boolean> {
  if (!element) {
    console.error('Target element for PDF generation not found');
    return false;
  }

  const {
    format = 'a4',
    orientation = 'portrait',
    margin = 8,
    scale = 2, // High resolution crisp text
    fitToSinglePage = false,
  } = options;

  try {
    // Create an offscreen staging container to guarantee authentic layout and typography
    const isThermal = Array.isArray(format) && format[0] === 80;
    const offscreen = document.createElement('div');
    offscreen.style.position = 'fixed';
    offscreen.style.left = '-9999px';
    offscreen.style.top = '0';
    offscreen.style.zIndex = '-9999';
    offscreen.style.background = '#ffffff';
    offscreen.style.opacity = '1';

    const clone = element.cloneNode(true) as HTMLElement;
    // Strip web card shadows, rounded corners, and outer borders for an authentic paper document
    clone.style.boxShadow = 'none';
    clone.style.borderRadius = '0px';
    clone.style.border = 'none';
    clone.style.margin = '0px';

    if (isThermal) {
      clone.style.width = '320px';
      clone.style.maxWidth = '320px';
      clone.style.minWidth = '320px';
    } else {
      clone.style.width = '794px';
      clone.style.maxWidth = '794px';
      clone.style.minWidth = '794px';
    }

    offscreen.appendChild(clone);
    document.body.appendChild(offscreen);

    let imgData: string;
    try {
      // Render with high resolution (pixelRatio 2.5) while skipping remote stylesheet crawling (skipFonts: true).
      // The browser already has 'Plus Jakarta Sans' loaded in memory and applies it natively to the SVG.
      // This completely avoids SecurityError: Failed to read the 'cssRules' property from 'CSSStyleSheet' on Google Fonts.
      imgData = await toPng(clone, {
        backgroundColor: '#ffffff',
        pixelRatio: Math.max(scale, 2.5),
        skipFonts: true,
        cacheBust: true,
      });
    } catch (renderError) {
      console.warn('Initial render notice, retrying with standard pixel ratio:', renderError);
      imgData = await toPng(clone, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: true,
      });
    } finally {
      if (offscreen.parentNode) {
        offscreen.parentNode.removeChild(offscreen);
      }
    }

    // Load the image into an Image object to read exact pixel dimensions
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load generated PNG image into memory'));
      img.src = imgData;
    });

    const imgNaturalWidth = img.naturalWidth || (isThermal ? 320 : 794);
    const imgNaturalHeight = img.naturalHeight || 1100;

    // Handle thermal receipt rolls (continuous roll format e.g. [80, ...])
    if (isThermal) {
      const printableWidth = Math.max(10, 80 - margin * 2);
      const imgWidth = printableWidth;
      const imgHeight = (imgNaturalHeight * printableWidth) / imgNaturalWidth;
      const rollHeight = Math.max(80, Math.ceil(imgHeight + margin * 2));

      const thermalPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, rollHeight],
      });

      thermalPdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
      const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      thermalPdf.save(cleanFilename);
      return true;
    }

    // Standard paper formats (A4, Letter, etc.)
    let pdfWidth: number;
    let pdfHeight: number;

    if (Array.isArray(format)) {
      pdfWidth = orientation === 'portrait' ? format[0] : format[1];
      pdfHeight = orientation === 'portrait' ? format[1] : format[0];
    } else if (format === 'letter') {
      pdfWidth = orientation === 'portrait' ? 215.9 : 279.4;
      pdfHeight = orientation === 'portrait' ? 279.4 : 215.9;
    } else {
      // standard A4 default
      pdfWidth = orientation === 'portrait' ? 210 : 297;
      pdfHeight = orientation === 'portrait' ? 297 : 210;
    }

    // Setup jsPDF
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: format,
    });

    const printableWidth = Math.max(10, pdfWidth - margin * 2);
    const printableHeight = Math.max(10, pdfHeight - margin * 2);
    const imgWidth = printableWidth;
    const imgHeight = (imgNaturalHeight * printableWidth) / imgNaturalWidth;

    // Smart auto-fit for single-page documents (invoices, proformas, receipts)
    // If fitToSinglePage is explicitly requested (e.g. 20+ item invoices) or if the document
    // is within single-page scale tolerance (up to 1.65x), scale it proportionally so it fits 100%
    // on one single page, completely eliminating accidental second pages!
    const shouldFitSinglePage = fitToSinglePage || (imgHeight > printableHeight && imgHeight <= printableHeight * 1.65);
    if (shouldFitSinglePage && imgHeight > printableHeight) {
      const fitRatio = printableHeight / imgHeight;
      const fittedWidth = imgWidth * fitRatio;
      const fittedHeight = printableHeight;
      const centeredX = margin + (printableWidth - fittedWidth) / 2;

      pdf.addImage(imgData, 'PNG', centeredX, margin, fittedWidth, fittedHeight, undefined, 'FAST');
      const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      pdf.save(cleanFilename);
      return true;
    }

    let heightLeft = imgHeight;
    let position = margin;

    // First page
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= printableHeight;

    // Remaining pages if long document (multi-page)
    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= printableHeight;
    }

    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
    return true;
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    // Fallback to window print
    window.print();
    return false;
  }
}

/**
 * Universal safe print handler that works even inside sandboxed iFrames
 */
export function safePrintDocument() {
  try {
    window.print();
  } catch (e) {
    console.warn('Direct print blocked, attempting fallback', e);
  }
}
