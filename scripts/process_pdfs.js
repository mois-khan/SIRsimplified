const fs = require('fs');
const PDFParser = require('pdf2json');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const PDF_DIR = path.resolve(__dirname, '../docs_2002_list');

async function processFile(filePath) {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();
        
        pdfParser.on("pdfParser_dataError", errData => {
            console.error(errData.parserError);
            reject(errData.parserError);
        });
        
        pdfParser.on("pdfParser_dataReady", async pdfData => {
            let allElectors = [];
            
            for (let page of pdfData.Pages) {
                let rows = [];
                let part_no = null;
                
                page.Texts.forEach(t => {
                    let text = decodeURIComponent(t.R[0].T).trim();
                    if (!text) return;
                    
                    // Extract PS No (Part No) from the header (top right)
                    if (t.y > 1.0 && t.y < 2.0 && t.x > 32.0 && t.x < 35.0 && !isNaN(parseInt(text))) {
                        part_no = text;
                    }
                    
                    // Group text elements into rows by their Y coordinate
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
                
                rows.sort((a, b) => a.y - b.y);
                
                rows.forEach(row => {
                    if (row.y < 3.0) return; // Skip the headers
                    
                    let sl_no = null, house_no = null, name = null, epic_no = null;
                    
                    row.items.forEach(item => {
                        if (item.x > 3 && item.x < 5.5) sl_no = item.text;
                        if (item.x > 8 && item.x < 11.5) house_no = item.text;
                        if (item.x > 11.5 && item.x < 20.0) {
                            name = name ? name + " " + item.text : item.text;
                        }
                        if (item.x > 31.0 && item.text !== "-" && item.text !== "Page") epic_no = item.text;
                    });
                    
                    // Ignore footer lines like "55 of 1 Page"
                    if (name && name.includes("Page")) return;
                    
                    if (sl_no || name) {
                        allElectors.push({ 
                            serial_no: sl_no === "-" ? null : sl_no, 
                            house_no: house_no === "-" ? null : house_no, 
                            name, 
                            epic_no: epic_no === "-" ? null : epic_no,
                            part_no 
                        });
                    }
                });
            }
            
            console.log(`✅ Parsed ${allElectors.length} electors from ${path.basename(filePath)}. Uploading to database...`);
            
            // Insert in batches of 500 to avoid Supabase payload limits
            for (let i = 0; i < allElectors.length; i += 500) {
                const batch = allElectors.slice(i, i + 500);
                const { error } = await supabase.from('electors_2002').insert(batch);
                if (error) {
                    console.error("❌ Insert error:", error.message);
                }
            }
            
            console.log(`🚀 Upload complete for ${path.basename(filePath)}!`);
            resolve();
        });
        
        pdfParser.loadPDF(filePath);
    });
}

async function main() {
    if (!fs.existsSync(PDF_DIR)) {
        console.error(`Directory not found: ${PDF_DIR}`);
        return;
    }

    const files = fs.readdirSync(PDF_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) {
        console.log("No PDFs found in the docs_2002_list directory.");
        return;
    }

    console.log(`Found ${files.length} PDFs. Starting local extraction (NO API LIMITS!)...`);
    for (const file of files) {
         await processFile(path.join(PDF_DIR, file));
    }
    console.log("🎉 All PDFs processed successfully!");
}

main();
