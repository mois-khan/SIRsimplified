const fs = require('fs');
const PDFParser = require('pdf2json');
const path = require('path');

const pdfParser = new PDFParser();
const testFile = path.resolve(__dirname, 'docs_2002_list/S29_219_44.pdf');

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    
    let electors = [];
    
    // Process first page to test
    const page = pdfData.Pages[0];
    
    // Group by Y (with 0.6 tolerance)
    let rows = [];
    page.Texts.forEach(t => {
        let text = decodeURIComponent(t.R[0].T).trim();
        if (!text) return;
        
        let added = false;
        for (let row of rows) {
            if (Math.abs(row.y - t.y) < 0.6) {
                row.items.push({ x: t.x, text });
                added = true;
                break;
            }
        }
        if (!added) {
            rows.push({ y: t.y, items: [{ x: t.x, text }] });
        }
    });
    
    // Sort rows by Y
    rows.sort((a, b) => a.y - b.y);
    
    rows.forEach(row => {
        // Skip header rows (y < 3)
        if (row.y < 3.0) return;
        
        let sl_no = null, house_no = null, name = null, epic_no = null;
        
        row.items.forEach(item => {
            if (item.x > 3 && item.x < 5.5) sl_no = item.text;
            if (item.x > 8 && item.x < 11.5) house_no = item.text;
            if (item.x > 11.5 && item.x < 19.5) {
                name = name ? name + " " + item.text : item.text;
            }
            if (item.x > 32.0) epic_no = item.text;
        });
        
        if (sl_no || name) {
            electors.push({ sl_no, house_no, name, epic_no });
        }
    });

    console.log(JSON.stringify(electors, null, 2));
});

if (fs.existsSync(testFile)) {
    pdfParser.loadPDF(testFile);
}
