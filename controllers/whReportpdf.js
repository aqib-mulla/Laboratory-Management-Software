import htmlPdf from 'html-pdf-node';

class WHHTMLToPDF {
    async generatePDF(htmlContent, filePath = null) {
        const options = { format: 'A4', margin: {
            top: '0mm',
            bottom: '0mm',
            left: '0mm',
            right: '0mm'
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

export default WHHTMLToPDF;
