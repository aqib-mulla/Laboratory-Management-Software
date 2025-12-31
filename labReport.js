import puppeteer from 'puppeteer-core';
import Bill from "../models/Bill.js";
import Test from "../models/Tests.js";
import GroupTest from "../models/GroupTest.js";
import BillDetail from '../models/BillDetails.js';
import CreateProfile from "../models/CreateProfile.js";
import labResultDetail from "../models/labResultDetail.js";
import labResult from "../models/labResult.js";
import PatientReg from '../models/PatientReg.js';
import FormData from 'form-data';
import nodemailer from 'nodemailer';
import pkg from 'qrcode';
import fs from 'fs';
import axios from 'axios';
import QRCode from 'qrcode';
import HTMLToPDF from './reportPdf.js';
import WHHTMLToPDF from './whReportpdf.js';



export const labReport = async (req, res) => {
    try {
        const id = req.params.id;
        const { selectedTestsData } = req.body;

        const bill = await Bill.findById(id)
            .populate('refId', 'pName pNum pAge pGender pSalutation')
            .populate('doctorName', 'drName')
            .exec();

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }

        const data = {
            data: {
                billId: bill.billId,
                pName: bill.refId.pName,
                pAge: bill.refId.pAge,
                pGender: bill.refId.pGender,
                pSal: bill.refId.pSalutation,
                drName: bill.doctorName.drName,
                billAmount: bill.billAmount,
                amountDue: bill.amountDue,
                amountPaid: bill.amountPaid,
                billDate: formatDate(bill.createdAt),
            },
            feesData: [],
        };

        const feesData = await labResultDetail.find({ objbillId: id });

        for (const fee of feesData) {
            if (selectedTestsData.includes(fee.resultId.toString())) {
                let feesType = await getFeesType(fee.fieldId, fee.type);
                if (feesType) {
                    let feesTypeName;
                    let reference_range = '';
                    let units = '';
                    let category = '';
                    let comments = '';
                    let method = '';
                    let labResultArray = [];

                    if (fee.type === 'Profile') {
                        // Your code for profile type tests
                    } else if (fee.type === 'Group') {
                        feesTypeName = feesType.groupName;
                        if (!data.feesData.some((details) => details.feesType === feesTypeName)) {
                            const group = await GroupTest.findById(fee.fieldId, 'testFields groupCategory');
                            if (group) {
                                const testIds = group.testFields.map(field => field.testId);
                                const testDetails = await Test.find({ _id: { $in: testIds } }, 'reference_range units name category comments method');
                                if (testDetails) {
                                    const orderedTestFields = group.testFields.map(field => {
                                        const testDetail = testDetails.find(detail => detail._id.equals(field.testId));
                                        return {
                                            _id: testDetail._id,
                                            name: testDetail.name,
                                            reference_range: testDetail.reference_range,
                                            units: testDetail.units,
                                            category: testDetail.category,
                                            comments: testDetail.comments,
                                            method: testDetail.method,
                                            testid: fee.testId,
                                            type: fee.type,
                                        };
                                    });

                                    // Fetch lab results based on the test ID
                                    const labResults = await labResultDetail.find({
                                        objbillId: id,
                                        id: { $in: testIds } // Filter by IDs
                                    });

                                    const labResultArray = orderedTestFields.map(test => {
                                        const groupTest = group.testFields.find(field => field.testId.equals(test._id));

                                        // Assuming that the testName is a property of the groupTest object
                                        const testName = groupTest ? groupTest.subCat : '';

                                        const resultsForTest = labResults.filter(result => result.id.equals(test._id));

                                        // Extracting both result and abnormalValue
                                        const testResults = resultsForTest.map(result => ({
                                            testName: testName,
                                            result: result.result,
                                            abnormalValue: result.abnormalValue, // Assuming there's an abnormalValue field in labResultDetail
                                        }));

                                        return testResults;
                                    }).flat(); // Use flat to flatten the nested arrays

                                    data.feesData.push({
                                        id: fee._id,
                                        type: fee.type,
                                        testid: fee.testId,
                                        feesType: feesTypeName,
                                        fees: fee.fees,
                                        category: group.groupCategory,
                                        discount: fee.discount,
                                        tests: orderedTestFields,
                                        labResults: labResultArray,
                                    });
                                }
                            }
                        }
                    } else {
                        feesTypeName = feesType.name;
                        reference_range = feesType.reference_range;
                        units = feesType.units;
                        category = feesType.category;
                        comments = feesType.comments;
                        method = feesType.method;

                        const labResults = await labResultDetail.find({ objbillId: id, fieldId: fee.fieldId });

                        const labResultArray = labResults.map(result => ({
                            result: result.result,
                            abnormalValue: result.abnormalValue,
                        }));

                        data.feesData.push({
                            id: fee._id,
                            type: fee.type,
                            testid: fee.testId,
                            feesType: feesTypeName,
                            fees: fee.fees,
                            reference_range: reference_range,
                            units: units,
                            comments: comments,
                            method: method,
                            category: category,
                            discount: fee.discount,
                            labResults: labResultArray,
                        });
                    }
                }
            }
        }

        const htmlContent = await generatePDF(data, id); // Pass id to the generatePDF function

        const htmlToPDF = new HTMLToPDF();
        const pdfBuffer = await htmlToPDF.generatePDF(htmlContent);

        const pdfFilePath = `./reports/${id}.pdf`;
        fs.writeFileSync(pdfFilePath, pdfBuffer);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=lab-report-${id}.pdf`);
        res.status(200).end(pdfBuffer);
    } catch (error) {
        console.error('Error fetching or generating data:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
};

const generatePDF = async (data, id) => {

    const doctorImagePath = './images/doctorSign.png';
    const doctorImageBuffer = fs.readFileSync(doctorImagePath);
    const doctorImageBase64 = doctorImageBuffer.toString('base64');

    const labImagePath = './images/labSign.png';
    const labImageBuffer = fs.readFileSync(labImagePath);
    const labImageBase64 = labImageBuffer.toString('base64');

    // Generate the QR code
    const qrCodeUrl = `https://memocares.com/labDemo/store/downloads/qrlab-result/38`;
    const qrCodeData = await QRCode.toDataURL(qrCodeUrl);

    const getPatientDetails = () => `
        <tr class="patient-details">
            <td colspan="2" style="border: 1px solid #000;">
                Patient Name: <strong>${data.data.pSal}. ${data.data.pName}</strong><br />
                Sex / Age: <strong>${data.data.pGender} / ${data.data.pAge}</strong><br />
                Referred By: <strong>${data.data.drName}</strong><br />
            </td>
            <td colspan="2" style="border: 1px solid #000;">
                Report ID: <strong>${data.data.billId}</strong><br />
                Sampling Date: <strong>${data.data.billDate}</strong><br />
                Report Date: <strong>${data.data.billDate}</strong><br />
            </td>
        </tr>
        <tr class="table-header">
            <th style="width: 45%;border: 1px solid #000;">Test Name</th>
            <th style="width: 25%; text-align: center;border: 1px solid #000;">Result</th>
            <th style="width: 30%;border: 1px solid #000;">Reference Range</th>
            <th style="width: 10%;border: 1px solid #000;">Unit</th>
        </tr>
        <tr>
            <td colspan="4" style="border: 1px solid #000;">
                <hr style="border: 1px solid #000;">
            </td>
        </tr>
    `;

    const htmlContent = `
    <html>
    <head>
        <style>
            @page {
                margin: 20mm;
            }
            .group-header {
                page-break-before: always;
            }
            .patient-details, .table-header {
                text-align: left;
                font-size: 15px;
            }
            .table-header th {
                font-size: 15px;
                text-align: left;
            }
            table {
                width: 100%;
                border-collapse: collapse;
            }
            th, td {
                padding: 8px;
                border: 1px solid #ddd;
            }
            th {
                background-color: #f2f2f2;
            }
            .end-report {
                margin-top: 20px;
                text-align: center;
                font-size: 16px;
            }
            .signatures {
                display: flex;
                justify-content: space-between;
                margin-top: 10px;
            }
            .signatures div {
                width: 30%;
                text-align: center;
            }
             .signatures p {
                margin: 0px;
                font-size: 14px;
            }
            .signatures img {
                width: 50%;
                height: auto;
            }
            .qr-code {
                text-align: center;
                margin-top: 20px;
            }
            .page-break {
                page-break-before: always;
            }
        </style>
    </head>
    <body>
        ${data.feesData.map((details, index, array) => {
        if (details.type === 'Group') {
            return `
                <table>
                    <thead>
                        ${getPatientDetails()}
                    </thead>
                    <tbody>
                        <tr style="height: 15px;"></tr>
                        <tr class="group-header">
                            <td colspan="4" style="text-align:center;border: 1px solid #000;"><strong>${details.category}</strong></td>
                        </tr>
                        ${details.feesType ? `<tr>
                            <td colspan="4" style="text-align:left;border: 1px solid #000;"><strong>${details.feesType}</strong></td>
                        </tr>` : ''}
                        ${details.tests.map((test, testIndex) => {
                const labResult = details.labResults[testIndex] || {};
                const testName = labResult.testName || '';
                const abnormalValue = labResult.abnormalValue || '';
                const formattedResult = abnormalValue === 'L' || abnormalValue === 'H' ?
                    `<strong style="color: red">${labResult.result || ''}</strong>` : labResult.result || '';

                return `
                                ${testName ? `<tr> <td colspan="4" style="text-align:left;border: 1px solid #000"><strong>${testName}</strong></td> </tr>` : ''}
                                <tr>
                                    <td style="border: 1px solid #000;">${test.name}${test.method ? `<br>(${test.method})` : ''}</td>
                                    <td style="text-align:center;border: 1px solid #000;">${formattedResult}</td>
                                    <td style="border: 1px solid #000;">${test.reference_range || ''}</td>
                                    <td style="border: 1px solid #000;">${test.units || ''}</td>
                                </tr>
                                 `;
            }).join('')}
                    </tbody>
                </table>
                <div class="page-break"></div>
                `;
        }
    }).join('')}

        <!-- Add content for individual tests -->
        ${data.feesData.filter(details => details.type !== 'Group').length > 0 ? `
        <div class="page-break"></div>
        <table>
            <thead>
                ${getPatientDetails()}
            </thead>
            <tbody>
                ${data.feesData.map((details, index, array) => {
        if (details.type !== 'Group') {
            return `
                        ${(index === 0 || array[index - 1].type === 'Group') ? `
                        <tr style="height: 15px;"></tr>
                        <tr class="group-header">
                            <td colspan="4" style="text-align:center;border: 1px solid #000;"><strong>${details.category}</strong></td>
                        </tr>` : ''}
                        <tr>
                            <td style="border: 1px solid #000;">${details.feesType} ${details.method ? `<br>(${details.method})` : ''}</td>
                            <td style="text-align:center;border: 1px solid #000;">${details.labResults[0] ?
                    (details.labResults[0].abnormalValue === 'L' || details.labResults[0].abnormalValue === 'H' ?
                        `<strong style="color: red;">${details.labResults[0].result || ''}</strong>` :
                        details.labResults[0].result || '') : ''}</td>                                
                            <td style="border: 1px solid #000;">${details.reference_range || ''}</td>
                            <td style="border: 1px solid #000;">${details.units || ''}</td>
                        </tr>
                        ${details.comments ? `
                            <tr>
                                <td colspan="4" style="padding-left: 15px; word-wrap: break-word;">
                                    ${details.comments}
                                </td>
                            </tr>` : ''
                }`;
        }
    }).join('')}
            </tbody>
        </table>
        ` : ''}

        <!-- Add content to display at the end of the report -->
        <div class="end-report">
            <p>End of the Report</p>
            <div class="signatures">
                <div>
                    <img src="data:image/jpeg;base64,${doctorImageBase64}" alt="Doctor Image" />
                    <p><strong>Doctor</strong></p>
                </div>
                <div>
                    <img src="data:image/jpeg;base64,${labImageBase64}" alt="Lab Technician Image" />
                    <p><strong>Lab Technician</strong></p>
                </div>
            </div>
            
        </div>
    </body>
    </html>
    `;

    return htmlContent;
};

export const WHlabReport = async (req, res) => {
    try {
        const id = req.params.id;
        const { selectedTestsData } = req.body;

        const bill = await Bill.findById(id)
            .populate('refId', 'pName pNum pAge pGender pSalutation')
            .populate('doctorName', 'drName')
            .exec();

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }

        const data = {
            data: {
                billId: bill.billId,
                pName: bill.refId.pName,
                pAge: bill.refId.pAge,
                pGender: bill.refId.pGender,
                pSal: bill.refId.pSalutation,
                drName: bill.doctorName.drName,
                billAmount: bill.billAmount,
                amountDue: bill.amountDue,
                amountPaid: bill.amountPaid,
                billDate: formatDate(bill.createdAt),
            },
            feesData: [],
        };

        const feesData = await labResultDetail.find({ objbillId: id });

        for (const fee of feesData) {
            if (selectedTestsData.includes(fee.resultId.toString())) {
                let feesType = await getFeesType(fee.fieldId, fee.type);
                if (feesType) {
                    let feesTypeName;
                    let reference_range = '';
                    let units = '';
                    let category = '';
                    let comments = '';
                    let method = '';
                    let labResultArray = [];

                    if (fee.type === 'Profile') {
                        // Your code for profile type tests
                    } else if (fee.type === 'Group') {
                        feesTypeName = feesType.groupName;
                        if (!data.feesData.some((details) => details.feesType === feesTypeName)) {
                            const group = await GroupTest.findById(fee.fieldId, 'testFields groupCategory');
                            if (group) {
                                const testIds = group.testFields.map(field => field.testId);
                                const testDetails = await Test.find({ _id: { $in: testIds } }, 'reference_range units name category comments method');
                                if (testDetails) {
                                    const orderedTestFields = group.testFields.map(field => {
                                        const testDetail = testDetails.find(detail => detail._id.equals(field.testId));
                                        return {
                                            _id: testDetail._id,
                                            name: testDetail.name,
                                            reference_range: testDetail.reference_range,
                                            units: testDetail.units,
                                            category: testDetail.category,
                                            comments: testDetail.comments,
                                            method: testDetail.method,
                                            testid: fee.testId,
                                            type: fee.type,
                                        };
                                    });

                                    // Fetch lab results based on the test ID
                                    const labResults = await labResultDetail.find({
                                        objbillId: id,
                                        id: { $in: testIds } // Filter by IDs
                                    });

                                    const labResultArray = orderedTestFields.map(test => {
                                        const groupTest = group.testFields.find(field => field.testId.equals(test._id));

                                        // Assuming that the testName is a property of the groupTest object
                                        const testName = groupTest ? groupTest.subCat : '';

                                        const resultsForTest = labResults.filter(result => result.id.equals(test._id));

                                        // Extracting both result and abnormalValue
                                        const testResults = resultsForTest.map(result => ({
                                            testName: testName,
                                            result: result.result,
                                            abnormalValue: result.abnormalValue, // Assuming there's an abnormalValue field in labResultDetail
                                        }));

                                        return testResults;
                                    }).flat(); // Use flat to flatten the nested arrays

                                    data.feesData.push({
                                        id: fee._id,
                                        type: fee.type,
                                        testid: fee.testId,
                                        feesType: feesTypeName,
                                        fees: fee.fees,
                                        category: group.groupCategory,
                                        discount: fee.discount,
                                        tests: orderedTestFields,
                                        labResults: labResultArray,
                                    });
                                }
                            }
                        }
                    } else {
                        feesTypeName = feesType.name;
                        reference_range = feesType.reference_range;
                        units = feesType.units;
                        category = feesType.category;
                        comments = feesType.comments;
                        method = feesType.method;

                        const labResults = await labResultDetail.find({ objbillId: id, fieldId: fee.fieldId });

                        const labResultArray = labResults.map(result => ({
                            result: result.result,
                            abnormalValue: result.abnormalValue,
                        }));

                        data.feesData.push({
                            id: fee._id,
                            type: fee.type,
                            testid: fee.testId,
                            feesType: feesTypeName,
                            fees: fee.fees,
                            reference_range: reference_range,
                            units: units,
                            comments: comments,
                            method: method,
                            category: category,
                            discount: fee.discount,
                            labResults: labResultArray,
                        });
                    }
                }
            }
        }

        const htmlContent = await WHgeneratePDF(data, id); // Pass id to the generatePDF function

        const htmlToPDF = new WHHTMLToPDF();
        const pdfBuffer = await htmlToPDF.generatePDF(htmlContent);

        const pdfFilePath = `./reports/${id}.pdf`;
        fs.writeFileSync(pdfFilePath, pdfBuffer);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=lab-report-${id}.pdf`);
        res.status(200).end(pdfBuffer);
    } catch (error) {
        console.error('Error fetching or generating data:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
};




export const cultureWHlabReport = async (req, res) => {
    try {
        const id = req.params.id;
        const { selectedTestsData } = req.body;

        const bill = await Bill.findById(id)
            .populate('refId', 'pName pNum pAge pGender pSalutation')
            .populate('doctorName', 'drName')
            .exec();

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }

        const data = {
            data: {
                billId: bill.billId,
                pName: bill.refId.pName,
                pAge: bill.refId.pAge,
                pGender: bill.refId.pGender,
                pSal: bill.refId.pSalutation,
                drName: bill.doctorName.drName,
                billAmount: bill.billAmount,
                amountDue: bill.amountDue,
                amountPaid: bill.amountPaid,
                billDate: formatDate(bill.createdAt),
            },
            feesData: [],
        };

        const feesData = await labResultDetail.find({ objbillId: id });

        for (const fee of feesData) {
            if (selectedTestsData.includes(fee.resultId.toString())) {
                const feesType = await getFeesType(fee.fieldId, fee.type);
                if (feesType) {
                    let feesTypeName;
                    let reference_range = '';
                    let units = '';
                    let category = '';
                    let comments = '';
                    let labResultArray = [];

                    if (fee.type === 'Profile') {
                        // Your code for profile type tests
                    } else if (fee.type === 'Group') {
                        feesTypeName = feesType.groupName;
                        if (!data.feesData.some((details) => details.feesType === feesTypeName)) {
                            // const labResults = await labResultDetail.find({ objbillId: id, fieldId: fee.fieldId });
                            // labResultArray = labResults.map(result => ({
                            //     result: result.result,
                            // }));

                            const group = await GroupTest.findById(fee.fieldId, 'testFields groupCategory');
                            if (group) {
                                const testIds = group.testFields.map(field => field.testId);
                                const testDetails = await Test.find({ _id: { $in: testIds } }, 'reference_range units name category comments');
                                if (testDetails) {
                                    const orderedTestFields = group.testFields.map(field => {
                                        const testDetail = testDetails.find(detail => detail._id.equals(field.testId));
                                        return {
                                            _id: testDetail._id,
                                            name: testDetail.name,
                                            reference_range: testDetail.reference_range,
                                            units: testDetail.units,
                                            category: testDetail.category,
                                            comments: testDetail.comments,
                                            testid: fee.testId,
                                            type: fee.type,
                                        };
                                    });

                                    // Fetch lab results based on the test ID
                                    const labResults = await labResultDetail.find({
                                        objbillId: id,
                                        id: { $in: testIds } // Filter by IDs
                                    });

                                    // console.log(labResults);


                                    // Map lab results for each test
                                    // const labResultArray = orderedTestFields.map(test => {
                                    //     const resultsForTest = labResults.filter(result => result.id.equals(test._id));
                                    //     return {
                                    //         result: resultsForTest.map(result => result.result),
                                    //     };
                                    // });

                                    const labResultArray = orderedTestFields.map(test => {
                                        const groupTest = group.testFields.find(field => field.testId.equals(test._id));

                                        // Assuming that the testName is a property of the groupTest object
                                        const testName = groupTest ? groupTest.subCat : '';

                                        const resultsForTest = labResults.filter(result => result.id.equals(test._id));

                                        return {
                                            testName: testName,
                                            result: resultsForTest.map(result => result.result),
                                        };
                                    });


                                    data.feesData.push({
                                        id: fee._id,
                                        type: fee.type,
                                        testid: fee.testId,
                                        feesType: feesTypeName,
                                        fees: fee.fees,
                                        category: group.groupCategory,
                                        discount: fee.discount,
                                        tests: orderedTestFields,
                                        labResults: labResultArray,
                                    });
                                }
                            }
                        }
                    } else {
                        feesTypeName = feesType.name;
                        reference_range = feesType.reference_range;
                        units = feesType.units;
                        category = feesType.category;
                        comments = feesType.comments;

                        const labResults = await labResultDetail.find({ objbillId: id, fieldId: fee.fieldId });
                        labResultArray = labResults.map(result => ({
                            result: result.result,
                        }));

                        data.feesData.push({
                            id: fee._id,
                            type: fee.type,
                            testid: fee.testId,
                            feesType: feesTypeName,
                            fees: fee.fees,
                            reference_range: reference_range,
                            units: units,
                            comments: comments,
                            category: category,
                            discount: fee.discount,
                            labResults: labResultArray,
                        });
                    }
                }
            }
        }


        const htmlContent = await CulturegeneratePDF(data, id); // Assuming you have a generateHTML function

        const htmlToPDF = new WHHTMLToPDF();
        const pdfBuffer = await htmlToPDF.generatePDF(htmlContent);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=lab-report-${id}.pdf`);
        res.status(200).end(pdfBuffer);
    } catch (error) {
        console.error('Error fetching or generating data:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
};



export const cultureNHlabReport = async (req, res) => {
    try {
        const id = req.params.id;
        const { selectedTestsData } = req.body;

        const bill = await Bill.findById(id)
            .populate('refId', 'pName pNum pAge pGender pSalutation')
            .populate('doctorName', 'drName')
            .exec();

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }

        const data = {
            data: {
                billId: bill.billId,
                pName: bill.refId.pName,
                pAge: bill.refId.pAge,
                pGender: bill.refId.pGender,
                pSal: bill.refId.pSalutation,
                drName: bill.doctorName.drName,
                billAmount: bill.billAmount,
                amountDue: bill.amountDue,
                amountPaid: bill.amountPaid,
                billDate: formatDate(bill.createdAt),
            },
            feesData: [],
        };

        const feesData = await labResultDetail.find({ objbillId: id });

        for (const fee of feesData) {
            if (selectedTestsData.includes(fee.resultId.toString())) {
                const feesType = await getFeesType(fee.fieldId, fee.type);
                if (feesType) {
                    let feesTypeName;
                    let reference_range = '';
                    let units = '';
                    let category = '';
                    let comments = '';
                    let labResultArray = [];

                    if (fee.type === 'Profile') {
                        // Your code for profile type tests
                    } else if (fee.type === 'Group') {
                        feesTypeName = feesType.groupName;
                        if (!data.feesData.some((details) => details.feesType === feesTypeName)) {
                            // const labResults = await labResultDetail.find({ objbillId: id, id: fee.id });
                            // labResultArray = labResults.map(result => ({
                            //     result: result.result,
                            // }));

                            const group = await GroupTest.findById(fee.fieldId, 'testFields groupCategory');
                            if (group) {
                                const testIds = group.testFields.map(field => field.testId);
                                const testDetails = await Test.find({ _id: { $in: testIds } }, 'reference_range units name category comments');
                                if (testDetails) {
                                    const orderedTestFields = group.testFields.map(field => {
                                        const testDetail = testDetails.find(detail => detail._id.equals(field.testId));
                                        return {
                                            _id: testDetail._id,
                                            name: testDetail.name,
                                            reference_range: testDetail.reference_range,
                                            units: testDetail.units,
                                            category: testDetail.category,
                                            comments: testDetail.comments,
                                            testid: fee.testId,
                                            type: fee.type,
                                        };
                                    });

                                    // Fetch lab results based on the test ID
                                    const labResults = await labResultDetail.find({
                                        objbillId: id,
                                        id: { $in: testIds } // Filter by IDs
                                    });

                                    // console.log(labResults);


                                    // Map lab results for each test
                                    // const labResultArray = orderedTestFields.map(test => {
                                    //     const resultsForTest = labResults.filter(result => result.id.equals(test._id));
                                    //     return {
                                    //         result: resultsForTest.map(result => result.result),
                                    //     };
                                    // });

                                    const labResultArray = orderedTestFields.map(test => {
                                        const groupTest = group.testFields.find(field => field.testId.equals(test._id));

                                        // Assuming that the testName is a property of the groupTest object
                                        const testName = groupTest ? groupTest.subCat : '';

                                        const resultsForTest = labResults.filter(result => result.id.equals(test._id));

                                        return {
                                            testName: testName,
                                            result: resultsForTest.map(result => result.result),
                                        };
                                    });



                                    data.feesData.push({
                                        id: fee._id,
                                        type: fee.type,
                                        testid: fee.testId,
                                        feesType: feesTypeName,
                                        fees: fee.fees,
                                        category: group.groupCategory,
                                        discount: fee.discount,
                                        tests: orderedTestFields,
                                        labResults: labResultArray,
                                    });
                                }
                            }
                        }
                    } else {
                        feesTypeName = feesType.name;
                        reference_range = feesType.reference_range;
                        units = feesType.units;
                        category = feesType.category;
                        comments = feesType.comments;

                        const labResults = await labResultDetail.find({ objbillId: id, fieldId: fee.fieldId });
                        labResultArray = labResults.map(result => ({
                            result: result.result,
                        }));

                        data.feesData.push({
                            id: fee._id,
                            type: fee.type,
                            testid: fee.testId,
                            feesType: feesTypeName,
                            fees: fee.fees,
                            reference_range: reference_range,
                            units: units,
                            comments: comments,
                            category: category,
                            discount: fee.discount,
                            labResults: labResultArray,
                        });
                    }
                }
            }
        }

        // const pdfBuffer = await NHculturegeneratePDF(data);

        // // Define a file path to save the PDF
        // const pdfFilePath = `./reports/lab-report-${id}.pdf`;

        // // Write the PDF buffer to the file
        // fs.writeFileSync(pdfFilePath, pdfBuffer);

        // // Send the generated PDF as a response
        // res.setHeader('Content-Type', 'application/pdf');
        // res.setHeader('Content-Disposition', `attachment; filename=lab-report-${id}.pdf`);
        // res.status(200).end(pdfBuffer);

        // // Return the PDF file path
        // return pdfFilePath;

        const htmlContent = await NHculturegeneratePDF(data, id); // Assuming you have a generateHTML function

        const htmlToPDF = new HTMLToPDF();
        const pdfBuffer = await htmlToPDF.generatePDF(htmlContent);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=lab-report-${id}.pdf`);
        res.status(200).end(pdfBuffer);
    } catch (error) {
        console.error('Error fetching or generating data:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
};

async function getFeesType(id, type) {
    try {
        switch (type) {
            case 'Test':
                return await Test.findById(id, 'name category units refrence_range comments');
            case 'Group':
                return await GroupTest.findById(id, 'groupName groupCategory');
            case 'Profile':
                return await CreateProfile.findById(id, 'profileName');
            default:
                return null;
        }
    } catch (error) {
        console.error('Error fetching fees type:', error);
        return null;
    }
}



export const sendWhatsapp = async (req, res) => {
    const billId = req.params.id;

    try {
        const bill = await Bill.findById(billId);

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        // Find the associated PatientReg document by _id from the refId field in Bill
        const patientRegId = bill.refId;

        if (!patientRegId) {
            return res.status(404).json({ error: 'PatientReg ID not found in the Bill document' });
        }

        // Fetch the PatientReg document by _id
        const patientReg = await PatientReg.findById(patientRegId);

        if (!patientReg) {
            return res.status(404).json({ error: 'PatientReg not found' });
        }

        // Get the phone number from the patientReg document
        const phoneNumber = patientReg.pNum;

        // Generate and save the PDF report
        // const pdfFilePath = await WHgeneratePDF(data); // Make sure 'data' contains the report data
        const pdfFilePath = await WHlabReport(req, res);

        const apiUrl = 'https://api.whatsdesk.in/v4/filefromdisk.php';
        const apiKey = 'cbEMMQdLJqBjBAikSS';

        // Create a FormData object
        const formData = new FormData();
        formData.append('data', fs.createReadStream(pdfFilePath)); // Attach the file
        formData.append('key', apiKey);
        formData.append('number', '91' + phoneNumber); // Assuming you need to prepend '91' to the contact number
        formData.append('caption', 'This is a test caption');

        // Make a POST request using axios with the FormData
        const response = await axios.post(apiUrl, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        // Handle the response here
        console.log('WhatsApp report sent successfully');
        return {
            status: true,
            message: 'success',
        };

    } catch (error) {
        console.error('Error sending WhatsApp report:', error);
        // Handle the error here
        return {
            status: false,
            message: 'error',
        };
    }
};

export const sendCultureWhatsapp = async (req, res) => {
    const billId = req.params.id;

    try {
        const bill = await Bill.findById(billId);

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        // Find the associated PatientReg document by _id from the refId field in Bill
        const patientRegId = bill.refId;

        if (!patientRegId) {
            return res.status(404).json({ error: 'PatientReg ID not found in the Bill document' });
        }

        // Fetch the PatientReg document by _id
        const patientReg = await PatientReg.findById(patientRegId);

        if (!patientReg) {
            return res.status(404).json({ error: 'PatientReg not found' });
        }

        // Get the phone number from the patientReg document
        const phoneNumber = patientReg.pNum;

        // Generate and save the PDF report
        // const pdfFilePath = await WHgeneratePDF(data); // Make sure 'data' contains the report data
        const pdfFilePath = await cultureWHlabReport(req, res);

        const apiUrl = 'https://api.whatsdesk.in/v4/filefromdisk.php';
        const apiKey = 'cbEMMQdLJqBjBAikSS';

        // Create a FormData object
        const formData = new FormData();
        formData.append('data', fs.createReadStream(pdfFilePath)); // Attach the file
        formData.append('key', apiKey);
        formData.append('number', '91' + phoneNumber); // Assuming you need to prepend '91' to the contact number
        formData.append('caption', 'This is a test caption');

        // Make a POST request using axios with the FormData
        const response = await axios.post(apiUrl, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        // Handle the response here
        console.log('WhatsApp report sent successfully');
        return {
            status: true,
            message: 'success',
        };

    } catch (error) {
        console.error('Error sending WhatsApp report:', error);
        // Handle the error here
        return {
            status: false,
            message: 'error',
        };
    }
};



const WHlabReportEmail = async (req, res, returnBuffer = false) => {
    try {
        const id = req.params.id;
        const { selectedTestsData } = req.body;

        const bill = await Bill.findById(id)
            .populate('refId', 'pName pNum pAge pGender pSalutation')
            .populate('doctorName', 'drName')
            .exec();

        if (!bill) {
            if (returnBuffer) {
                throw new Error('Bill not found');
            } else {
                return res.status(404).json({ message: 'Bill not found' });
            }
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }

        const data = {
            data: {
                billId: bill.billId,
                pName: bill.refId.pName,
                pAge: bill.refId.pAge,
                pGender: bill.refId.pGender,
                pSal: bill.refId.pSalutation,
                drName: bill.doctorName.drName,
                billAmount: bill.billAmount,
                amountDue: bill.amountDue,
                amountPaid: bill.amountPaid,
                billDate: formatDate(bill.createdAt),
            },
            feesData: [],
        };

        const feesData = await labResultDetail.find({ objbillId: id });

        for (const fee of feesData) {
            if (selectedTestsData.includes(fee.resultId.toString())) {
                let feesType = await getFeesType(fee.fieldId, fee.type);
                if (feesType) {
                    let feesTypeName;
                    let reference_range = '';
                    let units = '';
                    let category = '';
                    let comments = '';
                    let method = '';
                    let labResultArray = [];

                    if (fee.type === 'Profile') {
                        // Your code for profile type tests
                    } else if (fee.type === 'Group') {
                        feesTypeName = feesType.groupName;
                        if (!data.feesData.some((details) => details.feesType === feesTypeName)) {
                            const group = await GroupTest.findById(fee.fieldId, 'testFields groupCategory');
                            if (group) {
                                const testIds = group.testFields.map(field => field.testId);
                                const testDetails = await Test.find({ _id: { $in: testIds } }, 'reference_range units name category comments method');
                                if (testDetails) {
                                    const orderedTestFields = group.testFields.map(field => {
                                        const testDetail = testDetails.find(detail => detail._id.equals(field.testId));
                                        return {
                                            _id: testDetail._id,
                                            name: testDetail.name,
                                            reference_range: testDetail.reference_range,
                                            units: testDetail.units,
                                            category: testDetail.category,
                                            comments: testDetail.comments,
                                            method: testDetail.method,
                                            testid: fee.testId,
                                            type: fee.type,
                                        };
                                    });

                                    // Fetch lab results based on the test ID
                                    const labResults = await labResultDetail.find({
                                        objbillId: id,
                                        id: { $in: testIds } // Filter by IDs
                                    });

                                    const labResultArray = orderedTestFields.map(test => {
                                        const groupTest = group.testFields.find(field => field.testId.equals(test._id));

                                        // Assuming that the testName is a property of the groupTest object
                                        const testName = groupTest ? groupTest.subCat : '';

                                        const resultsForTest = labResults.filter(result => result.id.equals(test._id));

                                        // Extracting both result and abnormalValue
                                        const testResults = resultsForTest.map(result => ({
                                            testName: testName,
                                            result: result.result,
                                            abnormalValue: result.abnormalValue, // Assuming there's an abnormalValue field in labResultDetail
                                        }));

                                        return testResults;
                                    }).flat(); // Use flat to flatten the nested arrays

                                    data.feesData.push({
                                        id: fee._id,
                                        type: fee.type,
                                        testid: fee.testId,
                                        feesType: feesTypeName,
                                        fees: fee.fees,
                                        category: group.groupCategory,
                                        discount: fee.discount,
                                        tests: orderedTestFields,
                                        labResults: labResultArray,
                                    });
                                }
                            }
                        }
                    } else {
                        feesTypeName = feesType.name;
                        reference_range = feesType.reference_range;
                        units = feesType.units;
                        category = feesType.category;
                        comments = feesType.comments;
                        method = feesType.method;

                        const labResults = await labResultDetail.find({ objbillId: id, fieldId: fee.fieldId });

                        const labResultArray = labResults.map(result => ({
                            result: result.result,
                            abnormalValue: result.abnormalValue,
                        }));

                        data.feesData.push({
                            id: fee._id,
                            type: fee.type,
                            testid: fee.testId,
                            feesType: feesTypeName,
                            fees: fee.fees,
                            reference_range: reference_range,
                            units: units,
                            comments: comments,
                            method: method,
                            category: category,
                            discount: fee.discount,
                            labResults: labResultArray,
                        });
                    }
                }
            }
        }

        const htmlContent = await WHgeneratePDF(data, id); // Pass id to the generatePDF function

        const htmlToPDF = new WHHTMLToPDF();
        const pdfBuffer = await htmlToPDF.generatePDF(htmlContent);

        if (returnBuffer) {
            return { pdfBuffer, pName: data.data.pName };
        } else {
            const pdfFilePath = `./reports/${id}.pdf`;
            fs.writeFileSync(pdfFilePath, pdfBuffer);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=lab-report-${id}.pdf`);
            return res.status(200).end(pdfBuffer);
        }
    } catch (error) {
        console.error('Error fetching or generating data:', error);
        if (returnBuffer) {
            throw error;
        } else {
            return res.status(500).json({ error: 'An error occurred while processing the request' });
        }
    }
};

export const sendEmail = async (req, res) => {
    const billId = req.params.id;

    try {
        const bill = await Bill.findById(billId);

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        const patientRegId = bill.refId;

        if (!patientRegId) {
            return res.status(404).json({ error: 'PatientReg ID not found in the Bill document' });
        }

        const patientReg = await PatientReg.findById(patientRegId);

        if (!patientReg) {
            return res.status(404).json({ error: 'PatientReg not found' });
        }

        const toEmail = patientReg.pEmail;

        // Generate PDF buffer and get patient's name
        const { pdfBuffer, pName } = await WHlabReportEmail(req, res, true);

        // Create a transporter using your email service or SMTP server details
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'aqibmulla456@gmail.com',
                pass: 'tlgyurwmmrcgjanq',
            },
        });

        await transporter.verify((error, success) => {
            if (error) {
                console.error('SMTP connection error:', error);
                return res.status(500).json({ error: 'SMTP connection error' });
            } else {
                console.log('SMTP connection successful');
            }
        });

        const mailOptions = {
            from: 'aqibmulla456@gmail.com',
            to: toEmail,
            subject: 'Lab Report',
            text: 'Please find the attached lab report.',
            attachments: [
                {
                    filename: `lab-report-${pName}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ],
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);

        return res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'An error occurred while sending the email' });
    }
};


const cultureWHlabReportEmail = async (req, res, returnBuffer = false) => {
    try {
        const id = req.params.id;
        const { selectedTestsData } = req.body;

        const bill = await Bill.findById(id)
            .populate('refId', 'pName pNum pAge pGender pSalutation')
            .populate('doctorName', 'drName')
            .exec();

        if (!bill) {
            if (returnBuffer) {
                throw new Error('Bill not found');
            } else {
                return res.status(404).json({ message: 'Bill not found' });
            }
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }

        const data = {
            data: {
                billId: bill.billId,
                pName: bill.refId.pName,
                pAge: bill.refId.pAge,
                pGender: bill.refId.pGender,
                pSal: bill.refId.pSalutation,
                drName: bill.doctorName.drName,
                billAmount: bill.billAmount,
                amountDue: bill.amountDue,
                amountPaid: bill.amountPaid,
                billDate: formatDate(bill.createdAt),
            },
            feesData: [],
        };

        const feesData = await labResultDetail.find({ objbillId: id });

        for (const fee of feesData) {
            if (selectedTestsData.includes(fee.resultId.toString())) {
                const feesType = await getFeesType(fee.fieldId, fee.type);
                if (feesType) {
                    let feesTypeName;
                    let reference_range = '';
                    let units = '';
                    let category = '';
                    let comments = '';
                    let labResultArray = [];

                    if (fee.type === 'Profile') {
                        // Your code for profile type tests
                    } else if (fee.type === 'Group') {
                        feesTypeName = feesType.groupName;
                        if (!data.feesData.some((details) => details.feesType === feesTypeName)) {
                            const group = await GroupTest.findById(fee.fieldId, 'testFields groupCategory');
                            if (group) {
                                const testIds = group.testFields.map(field => field.testId);
                                const testDetails = await Test.find({ _id: { $in: testIds } }, 'reference_range units name category comments');
                                if (testDetails) {
                                    const orderedTestFields = group.testFields.map(field => {
                                        const testDetail = testDetails.find(detail => detail._id.equals(field.testId));
                                        return {
                                            _id: testDetail._id,
                                            name: testDetail.name,
                                            reference_range: testDetail.reference_range,
                                            units: testDetail.units,
                                            category: testDetail.category,
                                            comments: testDetail.comments,
                                            testid: fee.testId,
                                            type: fee.type,
                                        };
                                    });

                                    // Fetch lab results based on the test ID
                                    const labResults = await labResultDetail.find({
                                        objbillId: id,
                                        id: { $in: testIds } // Filter by IDs
                                    });

                                    const labResultArray = orderedTestFields.map(test => {
                                        const groupTest = group.testFields.find(field => field.testId.equals(test._id));
                                        const testName = groupTest ? groupTest.subCat : '';
                                        const resultsForTest = labResults.filter(result => result.id.equals(test._id));

                                        return {
                                            testName: testName,
                                            result: resultsForTest.map(result => result.result),
                                        };
                                    });

                                    data.feesData.push({
                                        id: fee._id,
                                        type: fee.type,
                                        testid: fee.testId,
                                        feesType: feesTypeName,
                                        fees: fee.fees,
                                        category: group.groupCategory,
                                        discount: fee.discount,
                                        tests: orderedTestFields,
                                        labResults: labResultArray,
                                    });
                                }
                            }
                        }
                    } else {
                        feesTypeName = feesType.name;
                        reference_range = feesType.reference_range;
                        units = feesType.units;
                        category = feesType.category;
                        comments = feesType.comments;

                        const labResults = await labResultDetail.find({ objbillId: id, fieldId: fee.fieldId });
                        labResultArray = labResults.map(result => ({
                            result: result.result,
                        }));

                        data.feesData.push({
                            id: fee._id,
                            type: fee.type,
                            testid: fee.testId,
                            feesType: feesTypeName,
                            fees: fee.fees,
                            reference_range: reference_range,
                            units: units,
                            comments: comments,
                            category: category,
                            discount: fee.discount,
                            labResults: labResultArray,
                        });
                    }
                }
            }
        }

        const htmlContent = await CulturegeneratePDF(data, id); // Assuming you have a generateHTML function

        const htmlToPDF = new WHHTMLToPDF();
        const pdfBuffer = await htmlToPDF.generatePDF(htmlContent);

        if (returnBuffer) {
            return { pdfBuffer, pName: data.data.pName };
        } else {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=lab-report-${id}.pdf`);
            return res.status(200).end(pdfBuffer);
        }
    } catch (error) {
        console.error('Error fetching or generating data:', error);
        if (returnBuffer) {
            throw error;
        } else {
            return res.status(500).json({ error: 'An error occurred while processing the request' });
        }
    }
};



export const sendCultureEmail = async (req, res) => {
    const billId = req.params.id;

    try {
        const bill = await Bill.findById(billId);

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        const patientRegId = bill.refId;

        if (!patientRegId) {
            return res.status(404).json({ error: 'PatientReg ID not found in the Bill document' });
        }

        const patientReg = await PatientReg.findById(patientRegId);

        if (!patientReg) {
            return res.status(404).json({ error: 'PatientReg not found' });
        }

        const toEmail = patientReg.pEmail;

        // Generate PDF buffer and get patient's name
        const { pdfBuffer, pName } = await cultureWHlabReportEmail(req, res, true);

        // Create a transporter using your email service or SMTP server details
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'aqibmulla456@gmail.com',
                pass: 'tlgyurwmmrcgjanq',
            },
        });

        await transporter.verify((error, success) => {
            if (error) {
                console.error('SMTP connection error:', error);
                return res.status(500).json({ error: 'SMTP connection error' });
            } else {
                console.log('SMTP connection successful');
            }
        });

        const mailOptions = {
            from: 'aqibmulla456@gmail.com',
            to: toEmail,
            subject: 'Lab Report',
            text: 'Please find the attached lab report.',
            attachments: [
                {
                    filename: `lab-report-${pName}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ],
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);

        return res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'An error occurred while sending the email' });
    }
};




const WHgeneratePDF = async(data, id) => {
    const doctorImagePath = './images/doctorSign.png';
    const doctorImageBuffer = fs.readFileSync(doctorImagePath);
    const doctorImageBase64 = doctorImageBuffer.toString('base64');

    const labImagePath = './images/labSign.png';
    const labImageBuffer = fs.readFileSync(labImagePath);
    const labImageBase64 = labImageBuffer.toString('base64');

    const headerImagePath = './images/hm_header.PNG';
    const headerImageBuffer = fs.readFileSync(headerImagePath);
    const headerImageBase64 = headerImageBuffer.toString('base64');

    const footerImagePath = './images/hm_header.PNG'; // Assuming the correct footer image path
    const footerImageBuffer = fs.readFileSync(footerImagePath);
    const footerImageBase64 = footerImageBuffer.toString('base64');

     // Generate the QR code
     const qrCodeUrl = `https://memocares.com/labDemo/store/downloads/qrlab-result/38`;
     const qrCodeData = await QRCode.toDataURL(qrCodeUrl);

    const getPatientDetails = () => `
    <div style="padding-top: 45mm;">
        <tr class="patient-details" >
            <td colspan="2" style="border: 2px solid #000;"> <!-- Added padding-top to create space -->
                Patient Name: <strong>${data.data.pSal}. ${data.data.pName}</strong><br />
                Sex / Age: <strong>${data.data.pGender} / ${data.data.pAge}</strong><br />
                Referred By: <strong>${data.data.drName}</strong><br />
            </td>
            <td colspan="2" style="border: 2px solid #000; "> <!-- Added padding-top to create space -->
                Report ID: <strong>${data.data.billId}</strong><br />
                Sampling Date: <strong>${data.data.billDate}</strong><br />
                Report Date: <strong>${data.data.billDate}</strong><br />
            </td>
        </tr>
        <tr class="table-header">
            <th style="width: 45%;border: 2px solid #000;">Test Name</th>
            <th style="width: 25%; text-align: center;border: 2px solid #000;">Result</th>
            <th style="width: 30%;border: 2px solid #000;">Reference Range</th>
            <th style="width: 10%;border: 2px solid #000;">Unit</th>
        </tr>
        <tr>
            <td colspan="4" style="border: 2px solid #000;">
                <hr style="border: 1px solid #000;">
            </td>
        </tr>
                    </div>
    `;

    const htmlContent = `
    <html>
    <head>
        <style>
          @page {
               margin: 20mm;
           }
            .group-header {
                page-break-before: always;
            }
            .patient-details, .table-header {
                text-align: left;
                font-size: 15px;
            }
            .table-header th {
                font-size: 15px;
                text-align: left;
            }
            table {
                width: 100%;
                border-collapse: collapse;
            }
            th, td {
                padding: 8px;
                border: 1px solid #ddd;
            }
            th {
                background-color: #f2f2f2;
            }
            .end-report {
                margin-top: 20px;
                text-align: center;
                font-size: 16px;
            }
            .signatures {
                display: flex;
                justify-content: space-between;
                margin-top: 1px;
            }
            .signatures div {
                width: 30%;
                text-align: center;
            }
            .signatures img {
                width: 50%;
                height: auto;
            }
              .signatures p {
                margin: 0px;
                font-size: 14px;
            }
            .page-break {
                page-break-before: always;
            }
            .header {
                position: fixed;
                top: 0; 
                left: 0;
                right: 0;
                text-align: center;
                margin-bottom: 20px;
            }
            .header img {
                max-width: 103%;
            }
            .footer {
                position: fixed;
                bottom: 0; 
                left: 0;
                right: 0;
                text-align: center;
                margin-top: 20px;
            }
            .footer img {
                max-width: 103%;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="data:image/jpeg;base64,${headerImageBase64}" alt="Header Image" />
        </div>

        ${data.feesData.map((details, index, array) => {
        if (details.type === 'Group') {
            return `
                <table>
                    <thead>
                        ${getPatientDetails()}
                    </thead>
                    <tbody>
                        <tr style="height: 15px;"></tr>
                        <tr class="group-header">
                            <td colspan="4" style="text-align:center;border: 1px solid #000; background-color:#d3d3d3;"><strong style="background-color:#d3d3d3;">${details.category}</strong></td>
                        </tr>
                        ${details.feesType ? `<tr>
                            <td colspan="4" style="text-align:left;border: 1px solid #000;background-color:#d3d3d3;"><strong style="background-color:#d3d3d3;">${details.feesType}</strong></td>
                        </tr>` : ''}
                        ${details.tests.map((test, testIndex) => {
                const labResult = details.labResults[testIndex] || {};
                const testName = labResult.testName || '';
                const abnormalValue = labResult.abnormalValue || '';
                const formattedResult = abnormalValue === 'L' || abnormalValue === 'H' ?
                    `<strong style="color: red">${labResult.result || ''}</strong>` : labResult.result || '';

                return `
                                ${testName ? `<tr> <td colspan="4" style="text-align:left;border: 1px solid #000;background-color:#d3d3d3;"><strong style="background-color:#d3d3d3;">${testName}</strong></td> </tr>` : ''}
                                <tr>
                                    <td style="border: 1px solid #000;">${test.name}${test.method ? `<br>(${test.method})` : ''}</td>
                                    <td style="text-align:center;border: 1px solid #000;">${formattedResult}</td>
                                    <td style="border: 1px solid #000;">${test.reference_range || ''}</td>
                                    <td style="border: 1px solid #000;">${test.units || ''}</td>
                                </tr>
                                 `;
            }).join('')}
                    </tbody>
                </table>
                <div class="page-break"></div>
                `;
        }
    }).join('')}

        <!-- Add content for individual tests -->
        ${data.feesData.filter(details => details.type !== 'Group').length > 0 ? `
        <div class="page-break"></div>
        <table>
            <thead>
                ${getPatientDetails()}
            </thead>
            <tbody>
                ${data.feesData.map((details, index, array) => {
        if (details.type !== 'Group') {
            return `
                        ${(index === 0 || array[index - 1].type === 'Group') ? `
                        <tr style="height: 15px;"></tr>
                        <tr class="group-header">
                            <td colspan="4" style="text-align:center;border: 1px solid #000;background-color:#d3d3d3;"><strong>${details.category}</strong></td>
                        </tr>` : ''}
                        <tr>
                            <td style="border: 1px solid #000;">${details.feesType} ${details.method ? `<br>(${details.method})` : ''}</td>
                            <td style="text-align:center;border: 1px solid #000;">${details.labResults[0] ?
                    (details.labResults[0].abnormalValue === 'L' || details.labResults[0].abnormalValue === 'H' ?
                        `<strong style="color: red;">${details.labResults[0].result || ''}</strong>` :
                        details.labResults[0].result || '') : ''}</td>                                
                            <td style="border: 1px solid #000;">${details.reference_range || ''}</td>
                            <td style="border: 1px solid #000;">${details.units || ''}</td>
                        </tr>
                        ${details.comments ? `
                            <tr>
                                <td colspan="4" style="padding-left: 15px; word-wrap: break-word;">
                                    ${details.comments}
                                </td>
                            </tr>` : ''
                }`;
        }
    }).join('')}
            </tbody>
        </table>
        ` : ''}

        <!-- Add content to display at the end of the report -->
        <div class="footer">
            <img src="data:image/jpeg;base64,${footerImageBase64}" alt="Footer Image" />
        </div>
        <div class="end-report">
            <p>End of the Report</p>
            <div class="signatures">
                <div>
                    <img src="data:image/jpeg;base64,${doctorImageBase64}" alt="Doctor Image" />
                    <p><strong>Doctor</strong></p>
                </div>
                <div>
                    <img src="data:image/jpeg;base64,${labImageBase64}" alt="Lab Technician Image" />
                    <p><strong>Technician</strong></p>
                </div>
            </div>
            
        </div>
    </body>
</html>
`;
    return htmlContent;
};



const CulturegeneratePDF = async (data, id) => {
    const doctorImagePath = './images/doctorSign.png';
    const doctorImageBuffer = fs.readFileSync(doctorImagePath);
    const doctorImageBase64 = doctorImageBuffer.toString('base64');

    const labImagePath = './images/labSign.png';
    const labImageBuffer = fs.readFileSync(labImagePath);
    const labImageBase64 = labImageBuffer.toString('base64');

    const headerImagePath = './images/hm_header.PNG';
    const headerImageBuffer = fs.readFileSync(headerImagePath);
    const headerImageBase64 = headerImageBuffer.toString('base64');

    const footerImagePath = './images/hm_header.PNG'; // Assuming the correct footer image path
    const footerImageBuffer = fs.readFileSync(footerImagePath);
    const footerImageBase64 = footerImageBuffer.toString('base64');

    // Generate the QR code
    const qrCodeUrl = `https://memocares.com/labDemo/store/downloads/qrlab-result/38`;
    const qrCodeData = await QRCode.toDataURL(qrCodeUrl);

    const getPatientDetails = () => `
    <div style="padding-top: 45mm;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="border: 2px solid #000; padding: 8px;">
                    Patient Name: <strong>${data.data.pSal}. ${data.data.pName}</strong><br />
                    Sex / Age: <strong>${data.data.pGender} / ${data.data.pAge}</strong><br />
                    Referred By: <strong>${data.data.drName}</strong><br />
                </td>
                <td style="border: 2px solid #000; padding: 8px;">
                    Report ID: <strong>${data.data.billId}</strong><br />
                    Sampling Date: <strong>${data.data.billDate}</strong><br />
                    Report Date: <strong>${data.data.billDate}</strong><br />
                </td>
            </tr>
        </table>
    </div>
    `;

    const htmlContent = `
    <html>
    <head>
        <style>
            @page {
                margin: 20mm;
            }
            .patient-details, .table-header {
                text-align: left;
                font-size: 15px;
            }
            .content-section {
                text-align: center;
                margin-top: 20px;
                font-size: 16px;
            }
            .test-name {
                text-align: center;
                margin-top: 10px;
                font-size: 15px;
            }
            .test-result {
                text-align: left;
                margin-top: 5px;
                font-size: 15px;
            }
            .end-report {
                margin-top: 20px;
                text-align: center;
                font-size: 16px;
            }
            .signatures {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
            }
            .signatures div {
                width: 30%;
                text-align: center;
            }
            .signatures img {
                width: 50%;
                height: auto;
            }
            .signatures p {
                margin: 0px;
                font-size: 14px;
            }
            .page-break {
                page-break-before: always;
            }
            .header {
                position: fixed;
                top: 0; 
                left: 0;
                right: 0;
                text-align: center;
                margin-bottom: 20px;
            }
            .header img {
                max-width: 103%;
            }
            .footer {
                position: fixed;
                bottom: 0; 
                left: 0;
                right: 0;
                text-align: center;
                margin-top: 20px;
            }
            .footer img {
                max-width: 103%;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="data:image/jpeg;base64,${headerImageBase64}" alt="Header Image" />
        </div>

        ${getPatientDetails()}

        ${data.feesData.map((details, index, array) => {
        if (details.type === 'Group') {
            return `
                <div class="content-section">
                    <strong>${details.category}</strong>
                    ${details.feesType ? `<p><strong>${details.feesType}</strong></p>` : ''}
                    ${details.tests.map((test, testIndex) => {
                const labResult = details.labResults[testIndex] || {};
                const abnormalValue = labResult.abnormalValue || '';
                const formattedResult = abnormalValue === 'L' || abnormalValue === 'H' ?
                    `<strong style="color: red">${labResult.result || ''}</strong>` : labResult.result || '';

                return `
                    <div class="test-name">${test.name}</div>
                    <div class="test-result">${formattedResult}</div>
                `;
            }).join('')}
                </div>
                
            `;
        }
    }).join('')}

        ${data.feesData.filter(details => details.type !== 'Group').length > 0 ? `
        <div class="content-section">
            ${data.feesData.map((details, index, array) => {
        if (details.type !== 'Group') {
            return `
                <div class="content-section">
                    <strong>${details.category}</strong>
                    <div class="test-name">${details.feesType} ${details.method ? `<br>(${details.method})` : ''}</div>
                    <div class="test-result">${details.labResults[0] ?
                (details.labResults[0].abnormalValue === 'L' || details.labResults[0].abnormalValue === 'H' ?
                    `<strong style="color: red;">${details.labResults[0].result || ''}</strong>` :
                    details.labResults[0].result || '') : ''}</div>
                    ${details.comments ? `<div class="test-result">${details.comments}</div>` : ''}
                </div>
            `;
        }
    }).join('')}
        </div>
        ` : ''}

        <div class="footer">
            <img src="data:image/jpeg;base64,${footerImageBase64}" alt="Footer Image" />
        </div>
        <div class="end-report">
            <p>End of the Report</p>
            <div class="signatures">
                <div>
                    <img src="data:image/jpeg;base64,${doctorImageBase64}" alt="Doctor Image" />
                    <p><strong>Doctor</strong></p>
                </div>
                 <div >
                    <img src="${qrCodeData}" alt="QR Code" />
                     <p>Scan to download the report</p>
                 </div>
                <div>
                    <img src="data:image/jpeg;base64,${labImageBase64}" alt="Lab Technician Image" />
                    <p><strong>Technician</strong></p>
                </div>
            </div>
           
        </div>
    </body>
</html>
`;
    return htmlContent;
};



const NHculturegeneratePDF = async (data, id) => {
    const doctorImagePath = './images/doctorSign.png';
    const doctorImageBuffer = fs.readFileSync(doctorImagePath);
    const doctorImageBase64 = doctorImageBuffer.toString('base64');

    const labImagePath = './images/labSign.png';
    const labImageBuffer = fs.readFileSync(labImagePath);
    const labImageBase64 = labImageBuffer.toString('base64');

    // Generate the QR code
    const qrCodeUrl = `https://memocares.com/labDemo/store/downloads/qrlab-result/38`;
    const qrCodeData = await QRCode.toDataURL(qrCodeUrl);

    const getPatientDetails = () => `
    <div>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="border: 2px solid #000; padding: 8px;">
                    Patient Name: <strong>${data.data.pSal}. ${data.data.pName}</strong><br />
                    Sex / Age: <strong>${data.data.pGender} / ${data.data.pAge}</strong><br />
                    Referred By: <strong>${data.data.drName}</strong><br />
                </td>
                <td style="border: 2px solid #000; padding: 8px;">
                    Report ID: <strong>${data.data.billId}</strong><br />
                    Sampling Date: <strong>${data.data.billDate}</strong><br />
                    Report Date: <strong>${data.data.billDate}</strong><br />
                </td>
            </tr>
        </table>
    </div>
    `;

    const htmlContent = `
    <html>
    <head>
        <style>
            @page {
                margin: 20mm;
            }
            .patient-details, .table-header {
                text-align: left;
                font-size: 15px;
            }
            .content-section {
                text-align: center;
                margin-top: 20px;
                font-size: 16px;
            }
            .test-name {
                text-align: center;
                margin-top: 10px;
                font-size: 15px;
            }
            .test-result {
                text-align: left;
                margin-top: 5px;
                font-size: 15px;
            }
            .end-report {
                margin-top: 20px;
                text-align: center;
                font-size: 16px;
            }
            .signatures {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
            }
            .signatures div {
                width: 30%;
                text-align: center;
            }
            .signatures img {
                width: 50%;
                height: auto;
            }
            .signatures p {
                margin: 0px;
                font-size: 14px;
            }
            .page-break {
                page-break-before: always;
            }
        </style>
    </head>
    <body>
        ${getPatientDetails()}

        ${data.feesData.map((details, index, array) => {
            if (details.type === 'Group') {
                return `
                    <div class="content-section">
                        <strong>${details.category}</strong>
                        ${details.feesType ? `<p><strong>${details.feesType}</strong></p>` : ''}
                        ${details.tests.map((test, testIndex) => {
                            const labResult = details.labResults[testIndex] || {};
                            const abnormalValue = labResult.abnormalValue || '';
                            const formattedResult = abnormalValue === 'L' || abnormalValue === 'H' ?
                                `<strong style="color: red">${labResult.result || ''}</strong>` : labResult.result || '';

                            return `
                                <div class="test-name">${test.name}</div>
                                <div class="test-result">${formattedResult}</div>
                            `;
                        }).join('')}
                    </div>
                 
                `;
            }
        }).join('')}

        ${data.feesData.filter(details => details.type !== 'Group').length > 0 ? `
           
            <div class="content-section">
                ${data.feesData.map((details, index, array) => {
                    if (details.type !== 'Group') {
                        return `
                            <div class="content-section">
                                <strong>${details.category}</strong>
                                <div class="test-name">${details.feesType} ${details.method ? `<br>(${details.method})` : ''}</div>
                                <div class="test-result">${details.labResults[0] ?
                                    (details.labResults[0].abnormalValue === 'L' || details.labResults[0].abnormalValue === 'H' ?
                                        `<strong style="color: red;">${details.labResults[0].result || ''}</strong>` :
                                        details.labResults[0].result || '') : ''}</div>
                                ${details.comments ? `<div class="test-result">${details.comments}</div>` : ''}
                            </div>
                        `;
                    }
                }).join('')}
            </div>
        ` : ''}

        <div class="end-report">
            <p>End of the Report</p>
            <div class="signatures">
                <div>
                    <img src="data:image/jpeg;base64,${doctorImageBase64}" alt="Doctor Image" />
                    <p><strong>Doctor</strong></p>
                </div>
                 <div>
                    <img src="${qrCodeData}" alt="QR Code" />
                    <p>Scan to download the report</p>
                </div>
                <div>
                    <img src="data:image/jpeg;base64,${labImageBase64}" alt="Lab Technician Image" />
                    <p><strong>Technician</strong></p>
                </div>
            </div>
           
        </div>
    </body>
</html>
`;
    return htmlContent;
};


