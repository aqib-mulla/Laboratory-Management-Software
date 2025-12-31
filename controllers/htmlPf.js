import htmlPdf from 'html-pdf-node';

class HTMLToPDF {
    async generatePDF(htmlContent, filePath = null) {
        const options = { format: 'A4', margin: {
            top: '10mm',
            bottom: '10mm',
            left: '10mm',
            right: '10mm'
        } };
        const file = { content: htmlContent };

        return new Promise((resolve, reject) => {
            htmlPdf.generatePdf(file, options).then(pdfBuffer => {
                if (filePath) {
                    fs.writeFileSync(filePath, pdfBuffer);
                }
                resolve(pdfBuffer);
            }).catch(err => {
                reject(err);
            });
        });
    }
}

export default HTMLToPDF;
