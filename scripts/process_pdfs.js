const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { GoogleGenAI } = require('@google/genai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY in .env.local. Please add it.");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const PDF_DIR = path.resolve(__dirname, '../docs_2002_list');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processPdf(filePath) {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();
    console.log(`Processing ${path.basename(filePath)} (${totalPages} pages)`);

    for (let i = 0; i < totalPages; i++) {
        try {
            // Split into 1-page PDF
            const subDoc = await PDFDocument.create();
            const [copiedPage] = await subDoc.copyPages(pdfDoc, [i]);
            subDoc.addPage(copiedPage);
            const pageBytes = await subDoc.save();
            const base64Data = Buffer.from(pageBytes).toString('base64');
            
            console.log(`Analyzing page ${i + 1}/${totalPages}...`);
            
            const prompt = `You are an expert data extraction assistant. This is a page from an Indian electoral roll.
Extract the details of every elector on this page into a JSON array.
If the page does not contain elector boxes, return an empty array [].
The format of each JSON object must be EXACTLY:
{
  "epic_no": "EPIC/ID Card No (extract if present, otherwise null)",
  "name": "Elector's Full Name",
  "house_no": "House No (extract if present, otherwise null)",
  "part_no": "Part No (Look at the header/footer of the page, otherwise null)",
  "serial_no": "Serial No / Sl No (Number assigned to this elector in their box, otherwise null)"
}
Return ONLY valid JSON. Do not include markdown blocks like \`\`\`json. Ensure perfect accuracy for names, serial numbers, and house numbers.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    prompt,
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: 'application/pdf'
                        }
                    }
                ],
                config: {
                    responseMimeType: "application/json"
                }
            });

            const text = response.text;
            let electors = [];
            try {
                electors = JSON.parse(text);
            } catch (e) {
                console.error(`Failed to parse JSON on page ${i+1}:`, text.substring(0,100));
                continue;
            }

            if (electors && electors.length > 0) {
                // Validate data
                const validElectors = electors.filter(e => e.name && e.name.trim() !== "");
                
                if (validElectors.length > 0) {
                    const { error } = await supabase.from('electors_2002').insert(validElectors);
                    if (error) {
                        console.error(`Supabase Insert Error on page ${i+1}:`, error.message);
                    } else {
                        console.log(`✅ Saved ${validElectors.length} electors from page ${i+1}`);
                    }
                }
            } else {
                 console.log(`No electors found on page ${i+1}`);
            }
            
            // Respect rate limits
            await delay(4500);
            
        } catch (err) {
            console.error(`Gemini API Error on page ${i+1}:`, err.message || err);
            
            // If quota exceeded (429), wait 60 seconds and retry the exact same page
            if (err.message && err.message.includes("429")) {
                console.log("⏳ Quota exceeded. Waiting 60 seconds before retrying...");
                await delay(61000);
                i--; // Retry this page
            } else {
                await delay(5000); // Standard backoff on other errors
            }
        }
    }
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

    for (const file of files) {
        await processPdf(path.join(PDF_DIR, file));
    }
    console.log("Finished processing all PDFs!");
}

main();
