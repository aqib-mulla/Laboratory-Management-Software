import { PDFDocument, rgb } from 'pdf-lib';
import { convert } from 'html-to-text';

const generatePDF = async (htmlContent) => {
    // Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();

    // Add a blank page to the document
    const page = pdfDoc.addPage();

    // Convert HTML to plain text
    const textContent = convert(htmlContent, {
        wordwrap: 130,
    });

    // Set the font size and position for the text
    const fontSize = 12;
    const { width, height } = page.getSize();
    const textWidth = width - 2 * 20;
    const textHeight = height - 2 * 20;

    // Draw the text on the PDF page
    page.drawText(textContent, {
        x: 20,
        y: textHeight - fontSize,
        size: fontSize,
        color: rgb(0, 0, 0),
        maxWidth: textWidth,
    });

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();

    return pdfBytes;
};

export default generatePDF;
