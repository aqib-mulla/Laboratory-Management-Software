// htmlToPdf.js
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { Parser } from 'htmlparser2';

class HTMLToPDF {
    constructor() {
        this.doc = new PDFDocument();
        this.tagsStack = []; // Initialize tagsStack in the constructor
    }

    parseHTML(html) {
        return new Promise((resolve, reject) => {
            const parser = new Parser({
                onopentag: (name, attribs) => {
                    this.tagsStack.push({ name, attribs }); // Access tagsStack from instance
                },
                ontext: (text) => {
                    this.handleText(text);
                },
                onclosetag: (tagname) => {
                    this.tagsStack.pop(); // Access tagsStack from instance
                },
                onerror: (error) => {
                    reject(error);
                },
                onend: () => {
                    resolve();
                }
            });
            parser.write(html);
            parser.end();
        });
    }

    handleText(text) {
        const currentTag = this.getCurrentTag();
        if (currentTag && currentTag.name === 'div') {
            this.doc.text(text, {
                align: currentTag.attribs.style?.includes('text-align: center') ? 'center' : 'left'
            });
        } else {
            this.doc.text(text);
        }
    }

    getCurrentTag() {
        return this.tagsStack.length > 0 ? this.tagsStack[this.tagsStack.length - 1] : null; // Access tagsStack from instance
    }

    async generatePDF(html, outputPath) {
        this.doc.pipe(fs.createWriteStream(outputPath));
        await this.parseHTML(html);
        this.doc.end();
    }
}

export default HTMLToPDF;
