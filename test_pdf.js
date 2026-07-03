const fs = require('fs');
const PDFParser = require('pdf2json');
const path = require('path');

const pdfParser = new PDFParser();
const testFile = path.resolve(__dirname, 'docs_2002_list/S29_219_44.pdf');

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    console.log("PDF parsed successfully!");
    // Check if there is any text in the first page
    if (pdfData.Pages && pdfData.Pages.length > 0) {
        const page1 = pdfData.Pages[0];
        console.log(`Page 1 has ${page1.Texts.length} text elements.`);
        
        // Print the first 20 text elements to see what they look like
        for(let i=0; i<Math.min(20, page1.Texts.length); i++) {
            const textItem = page1.Texts[i];
            const textString = decodeURIComponent(textItem.R[0].T);
            console.log(`Text: "${textString}" at X: ${textItem.x}, Y: ${textItem.y}`);
        }
    } else {
        console.log("No text found. The PDF might be a scanned image.");
    }
});

if (fs.existsSync(testFile)) {
    pdfParser.loadPDF(testFile);
} else {
    console.log("File not found:", testFile);
}
