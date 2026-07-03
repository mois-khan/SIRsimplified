const fs = require('fs');
const PDFParser = require('pdf2json');
const path = require('path');

const pdfParser = new PDFParser();
const testFile = path.resolve(__dirname, 'docs_2002_list/S29_219_44.pdf');

pdfParser.on("pdfParser_dataReady", pdfData => {
    let page = pdfData.Pages[0];
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
        if (!added) rows.push({ y: t.y, items: [{ x: t.x, text }] });
    });
    
    rows.sort((a, b) => a.y - b.y);
    
    console.log("--- FIRST 5 DATA ROWS RAW ---");
    let dataRows = rows.filter(r => r.y > 3.0).slice(0, 5);
    dataRows.forEach((row, i) => {
        console.log(`\nRow ${i+1} (Y: ${row.y}):`);
        row.items.sort((a, b) => a.x - b.x).forEach(item => {
            console.log(`  X: ${item.x.toFixed(2)} -> "${item.text}"`);
        });
    });
});

pdfParser.loadPDF(testFile);
