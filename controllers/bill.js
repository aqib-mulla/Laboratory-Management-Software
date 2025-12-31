import Bill from "../models/Bill.js";
import BillDetail from "../models/BillDetails.js";
import GroupTest from "../models/GroupTest.js";
import Test from "../models/Tests.js";
import CreateProfile from "../models/CreateProfile.js";
import labResultDetail from "../models/labResultDetail.js";
import labResult from "../models/labResult.js";
import PatientReg from "../models/PatientReg.js";
import puppeteer from 'puppeteer';
import { PDFDocument, rgb } from 'pdf-lib';
import PdfCreator from 'pdf-creator-node';
import BwipJs from "bwip-js";
import HTMLToPDF from './htmlPf.js';
import pdf from 'html-pdf';
import fs from 'fs';




export const bill = async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    try {
        const { date } = req.query; // Get the date parameter from the query string

        async function getBillsWithDetails() {
            let query = Bill.find();

            // If a date parameter is provided, add a filter to the query
            if (date) {
                // Assuming date is in the format 'YYYY-MM-DD'
                const startDate = new Date(date);
                const endDate = new Date(date);
                endDate.setDate(endDate.getDate() + 1); // Set end date to the next day
                query = query.where('createdAt').gte(startDate).lt(endDate);
            }

            const billsWithDetails = await query
                .populate('refId', 'pName pNum pAge pGender pSalutation')
                .populate('doctorName', 'drName')
                .exec();

            const formattedBills = billsWithDetails.map((bill) => ({
                objbillId: bill._id,
                pName: bill.refId.pName,
                pSal: bill.refId.pSalutation,
                pNum: bill.refId.pNum,
                drName: bill.doctorName.drName,
                billId: bill.billId,
                billDate: formatDate(bill.createdAt),
                billAmount: bill.billAmount,
                amountDue: bill.amountDue,
                amountPaid: bill.amountPaid,
                discountAmount: bill.discountAmount,
                // ... other bill details
            }));

            res.status(200).json({ bills: formattedBills });
        }

        await getBillsWithDetails();

        function formatDate(dateString) {
            const date = new Date(dateString);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
    } catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({ error: 'Failed to fetch bills' });
    }
};



export const billDetails = async (req, res) => {
    try {
        const id = req.params.id;

        const bill = await Bill.findById(id)
            .populate('refId', 'pName pNum pAge pGender pSalutation') // Reference to the PatientReg model, selecting only pName and pNum fields
            .populate('doctorName', 'drName') // Reference to the Doctor model, selecting only doctorName field
            .exec();

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        function formatDates(dateString) {
            const date = new Date(dateString);
            const day = date.getDate();
            const month = date.getMonth() + 1; // Adding 1 because getMonth() returns 0-based index
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }


        const data = {
            data: {
                billId: bill.billId,
                pName: bill.refId.pName,
                pSal: bill.refId.pSalutation,
                pAge: bill.refId.pAge,
                pGender: bill.refId.pGender,
                drName: bill.doctorName.drName,
                billAmount: bill.billAmount,
                amountDue: bill.amountDue,
                amountPaid: bill.amountPaid,
                discountAmount: bill.discountAmount,
                billDate: formatDates(bill.createdAt),
                // Add other properties from the bill and populated models
            },
            feesData: [],
        };

        const feesData = await BillDetail.find({ refBillId: id });
        for (const fee of feesData) {
            const feesType = await getFeesType(fee.testId, fee.type);
            if (feesType) {
                let feesTypeName;
                if (fee.type === 'Profile') {
                    feesTypeName = feesType.profileName;
                } else if (fee.type === 'Group') {
                    const group = await GroupTest.findById(fee.testId, 'groupName');
                    feesTypeName = group.groupName;
                } else {
                    feesTypeName = feesType.name;
                }

                data.feesData.push({
                    id: fee._id,
                    type: fee.type,
                    id: fee.testId,
                    feesType: feesTypeName,
                    fees: fee.fees,
                    discount: fee.discount,
                });
            }
        }

        res.json(data);
        // return data;
    } catch (error) {
        console.error('Error fetching bill details:', error);
        res.status(500).json({ error: 'Failed to fetch bill details' });
    }
};

// Helper function to get fees type
async function getFeesType(id, type) {
    try {
        switch (type) {
            case 'Test':
                return await Test.findById(id, 'name');
            case 'Group':
                return await GroupTest.findById(id, 'groupName');
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




export const collectDueAmount = async (req, res) => {
    const billId = req.params.id;
    const { dueAmount } = req.body;

    try {
        // Find the bill by its ID
        const bill = await Bill.findById(billId);

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        if (dueAmount > bill.amountDue) {
            return res.status(400).json({ error: 'Collected amount cannot be greater than the due amount' });
        }

        // Subtract the collected amount from the due amount
        bill.amountDue -= dueAmount;
        bill.amountPaid += dueAmount;

        // Save the updated bill
        await bill.save();

        // Send the updated bill details in the response
        const updatedBillDetails = {
            billAmount: bill.billAmount,
            amountPaid: bill.amountPaid,
            amountDue: bill.amountDue
        };

        return res.json({ message: 'Due amount collected successfully', updatedBillDetails });
    } catch (error) {
        console.error('Error updating due amount:', error);
        return res.status(500).json({ error: 'An error occurred while updating due amount' });
    }
};



export const updatebillTest = async (req, res) => {
    const billId = req.params.id;

    try {
        const { selectedTests } = req.body;

        // Find the Bill document by ID
        const bill = await Bill.findById(billId);

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        // Calculate the total fees of selected tests
        let totalFees = 0;
        selectedTests.forEach((test) => {
            if (test.fees) {
                totalFees += parseFloat(test.fees); // Parse fees as a float
            } else if (test.profilePrice) {
                totalFees += parseFloat(test.profilePrice); // Parse profilePrice as a float
            } else if (test.groupPrice) {
                totalFees += parseFloat(test.groupPrice); // Parse groupPrice as a float
            }
        });

        // Update the amountDue field with the calculated total fees
        bill.amountDue += totalFees;
        bill.billAmount += totalFees;

        // Create an array to store BillDetail entries for selected tests
        const billDetailPromises = selectedTests.map(async (test) => {
            const { _id, type, fees, profilePrice, groupPrice } = test;

            const billDetail = new BillDetail({
                refBillId: billId,
                testId: _id,
                type,
                fees: fees || profilePrice || groupPrice,
                feesType: test.name, // Rename 'name' to 'feesType'
                // ... other properties
            });

            return await billDetail.save();
        });

        // Wait for all BillDetail promises to resolve
        await Promise.all(billDetailPromises);

        // Save the updated Bill with the new amountDue
        await bill.save();

        // Create the updatedSelectedTests array with feesType instead of name
        const updatedSelectedTests = selectedTests.map((test) => ({
            ...test,
            feesType: test.name || test.groupName,
            fees: test.fees || test.groupPrice,
        }));

        // Respond with saved data, including updatedSelectedTests, billAmount, and amountDue
        res.status(201).json({
            message: 'Bill and BillDetail updated successfully',
            updatedSelectedTests,
            billAmount: bill.billAmount,
            amountDue: bill.amountDue,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};




export const deleteBill = async (req, res) => {
    try {
        // Extract the billId from the request parameters
        const billId = req.params.id;

        // First, find and delete related BillDetail documents
        const billDetailsToDelete = await BillDetail.find({ refBillId: billId });

        // Delete related LabResultDetails documents based on objbillId
        const labResultDetailsIdsToDelete = billDetailsToDelete.map((detail) => detail.refBillId);
        await labResultDetail.deleteMany({ objbillId: { $in: labResultDetailsIdsToDelete } });

        // Now, delete related LabResult documents based on objbillId
        await labResult.deleteMany({ objbillId: { $in: labResultDetailsIdsToDelete } });

        // Finally, delete the Bill and BillDetail documents
        await BillDetail.deleteMany({ refBillId: billId });

        // Find the Bill document by _id
        const billToDelete = await Bill.findById(billId);

        if (!billToDelete) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        await Bill.findByIdAndDelete(billId);

        res.status(200).json({ message: 'Bill and its details deleted successfully' });
    } catch (error) {
        console.error('Error deleting bill and details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


export const getBillDetails = async (id) => {
    try {
        // const id = req.params.id;

        const bill = await Bill.findById(id)
            .populate('refId', 'pName pNum pAge pGender pSalutation') // Reference to the PatientReg model, selecting only pName and pNum fields
            .populate('doctorName', 'drName') // Reference to the Doctor model, selecting only doctorName field
            .exec();

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        function formatDates(dateString) {
            const date = new Date(dateString);
            const day = date.getDate();
            const month = date.getMonth() + 1; // Adding 1 because getMonth() returns 0-based index
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }


        const data = {
            data: {
                billId: bill.billId,
                pName: bill.refId.pName,
                pSal: bill.refId.pSalutation,
                pAge: bill.refId.pAge,
                pGender: bill.refId.pGender,
                drName: bill.doctorName.drName,
                billAmount: bill.billAmount,
                amountDue: bill.amountDue,
                amountPaid: bill.amountPaid,
                discountAmount: bill.discountAmount,
                billDate: formatDates(bill.createdAt),
                // Add other properties from the bill and populated models
            },
            feesData: [],
        };

        const feesData = await BillDetail.find({ refBillId: id });
        for (const fee of feesData) {
            const feesType = await getFeesType(fee.testId, fee.type);
            if (feesType) {
                let feesTypeName;
                if (fee.type === 'Profile') {
                    feesTypeName = feesType.profileName;
                } else if (fee.type === 'Group') {
                    const group = await GroupTest.findById(fee.testId, 'groupName');
                    feesTypeName = group.groupName;
                } else {
                    feesTypeName = feesType.name;
                }

                data.feesData.push({
                    id: fee._id,
                    type: fee.type,
                    id: fee.testId,
                    feesType: feesTypeName,
                    fees: fee.fees,
                    discount: fee.discount,
                });
            }
        }

        return data;
    } catch (error) {
        console.error('Error fetching bill details:', error);
        res.status(500).json({ error: 'Failed to fetch bill details' });
    }
};


// export const applyDiscount = async (req, res) => {
//     const { objbillId } = req.params;
//     const { discountAmount } = req.body;
  
//     try {
//       const bill = await Bill.findById(objbillId);
  
//       if (!bill) {
//         return res.status(404).json({ message: 'Bill not found' });
//       }
  
//       const discountAmountNumber = parseFloat(discountAmount);
  
//       if (isNaN(discountAmountNumber) || discountAmountNumber <= 0) {
//         return res.status(400).json({ message: 'Invalid discount amount' });
//       }
  
//       const newAmountDue = bill.amountDue - discountAmountNumber;
     
//       bill.discountAmount = discountAmountNumber;
//       bill.amountDue = newAmountDue;
  
//       await bill.save();
  
//       res.json({ message: 'Discount applied successfully', updatedBillDetails: bill });
//     } catch (error) {
//       console.error('Error applying discount:', error);
//       res.status(500).json({ message: 'Internal server error' });
//     }
// };

export const applyDiscount = async (req, res) => {
    const { objbillId } = req.params;
    const { discount } = req.body;

    try {
        // Fetch the bill by ID
        const bill = await Bill.findById(objbillId);

        // Check if the bill exists
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        // Parse and validate the discount amount
        const discountAmountNumber = parseFloat(discount);
        if (isNaN(discountAmountNumber) || discountAmountNumber <= 0) {
            return res.status(400).json({ message: 'Invalid discount amount' });
        }

        // Ensure that the discount does not exceed the amount due
        if (bill.amountDue <= 0) {
            return res.status(400).json({ message: 'Amount due is not positive' });
        }

        // Calculate the new amount due, ensuring it does not go below zero
        const newAmountDue = Math.max(bill.amountDue - discountAmountNumber, 0);

        // Accumulate the discount amount
        const updatedDiscountAmount = (bill.discountAmount || 0) + discountAmountNumber;

        // Update the bill with the accumulated discount amount and new amount due
        bill.discountAmount = updatedDiscountAmount;
        bill.amountDue = newAmountDue;

        // Save the updated bill
        await bill.save();

        // Respond with the updated bill details
        res.json({ message: 'Discount applied successfully', updatedBillDetails: bill });
    } catch (error) {
        console.error('Error applying discount:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



export const billPrint = async (req, res) => {
    try {
        const id = req.params.id;
        // Assuming you have the billData available
        const billData = await getBillDetails(id);

        // Generate the HTML content for the bill
        const billDetailsHTML = await generateBillHTML(billData);

        // Initialize HTMLToPDF
        const htmlToPDF = new HTMLToPDF();

        // Generate PDF from HTML content
        const pdfBuffer = await htmlToPDF.generatePDF(billDetailsHTML);

        // Set response headers to indicate PDF content
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=bill.pdf');

        // Send the PDF buffer as a response
        res.status(200).send(pdfBuffer);
    } catch (error) {
        console.error('Error printing bill:', error);
        res.status(500).json({ error: 'Failed to print bill' });
    }
};

// Helper function to generate bill HTML
// const generateBillHTML = (data) => {
//     let serialNumber = 1; // Initialize the serial number

//     const billDetailsHTML = `
//         <div style="text-align: center;">
//             <span style="font-weight: bold; font-size: 30px;">Care Conquer</span> <br> <br>
//             <span>46/4, Hosur Rd, Kudlu Gate, Krishna Reddy Industrial Area, H.S</span><br>
//             <span>, R Extension, Bengaluru, Karnataka 560068</span><br>
//             <span>Email: careconqueronline@gmail.com</span><br>
//             <span>PH: 8574968523 </span>
//             <h5 style="text-align:center">BILL RECEIPT</h5>
//             <hr style="border-top: 1px solid #000; margin: 0;">
//         </div>
//         <div style="display: inline-block; width: 48%; margin: 10px 0 0;">
//             <table>
//                 <tr>
//                     <td>Patient Name:</td>
//                     <td><strong>${data.data.pSal}. ${data.data.pName}</strong></td>
//                 </tr>
//                 <tr>
//                     <td>Sex / Age:</td>
//                     <td><strong>${data.data.pGender} / ${data.data.pAge}</strong></td>
//                 </tr>
//                 <tr>
//                     <td>Referred By:</td>
//                     <td><strong>${data.data.drName}</strong></td>
//                 </tr>
//             </table>
//         </div>
//         <div style="display: inline-block; width: 48%;">
//             <table>
//                 <tr>
//                     <td>Bill ID:</td>
//                     <td><strong>${data.data.billId}</strong></td>
//                 </tr>
//                 <tr>
//                     <td>Bill Date:</td>
//                     <td><strong>${data.data.billDate}</strong></td>
//                 </tr>
//             </table>
//         </div>
//         <hr style="border-top: 1px solid #000; margin: 10px 0 0;">
//         <div class="row">
//             <div class="col-12">
//                 <table style="width: 100%;">
//                     <thead>
//                         <tr>
//                             <th style="width: 10% ; text-align:left">Sl No.</th>
//                             <th style="width: 60%; text-align:left">Test Name</th>
//                             <th style="width: 30%; text-align:right">Price</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         ${data.feesData.map((details) => (
//         `<tr>
//                                 <td style="text-align:left; font-size:13px">${serialNumber++}</td>
//                                 <td style="text-align:left; font-size:13px">${details.feesType}</td>
//                                 <td style="text-align:right; font-size:13px">${details.fees}</td>
//                             </tr>`
//     )).join('')}
//                     </tbody>
//                 </table>
//                 <hr style="border-top: 1px solid #000; margin: 0;">
//             </div>
//         </div>
//         <div class="row" style="margin-top: 10px;">
//             <div class="col-6"></div>
//             <div class="col-6" style="text-align:right;">
//                 <span> Grand Total: ${data.data.billAmount}</span><br>
//                 <span> Paid: ${data.data.amountPaid}</span><br>
//                 <span> Due: ${data.data.amountDue}</span><br>
//             </div>
//         </div>
//     `;

//     return billDetailsHTML;
// };

const generateBillHTML = async (data) => {
    let serialNumber = 1; // Initialize the serial number

    const barcodeData = await new Promise((resolve, reject) => {
        BwipJs.toBuffer({
            bcid: 'code128',       // Barcode type
            text: `${data.data.pSal} ${data.data.pName} ${data.data.pGender} ${data.data.pAge}`, // Text to encode
            scale: 3,              // 3x scaling factor
            height: 10,            // Bar height, in millimeters
            includetext: false,    // Do not show human-readable text
            textxalign: 'center',  // Align text to center (won't matter as text is not included)
        }, (err, png) => {
            if (err) {
                reject(err);
            } else {
                resolve(`data:image/png;base64,${png.toString('base64')}`);
            }
        });
    });

    const billDetailsHTML = `
        <div style="text-align: center;">
            <span style="font-weight: bold; font-size: 30px;">KAZI LABORATORY</span> <br>
            <span>B.M. NAGTHAN BUILDING, OPP KANNAT MASJID, J.M. ROAD, NEAR BADI KAMAN, VIJAYAPURA - 586101 </span><br>
            <h5 style="text-align:center">BILL RECEIPT</h5>
            <hr style="border-top: 1px solid #000; margin: 0;">
        </div>
        <div style="display: inline-block; width: 48%; margin: 10px 0 0;">
            <table>
                <tr>
                    <td>Patient Name:</td>
                    <td><strong>${data.data.pSal}. ${data.data.pName}</strong></td>
                </tr>
                <tr>
                    <td>Sex / Age:</td>
                    <td><strong>${data.data.pGender} / ${data.data.pAge}</strong></td>
                </tr>
                <tr>
                    <td>Referred By:</td>
                    <td><strong>${data.data.drName}</strong></td>
                </tr>
            </table>
        </div>
        <div style="display: inline-block; width: 48%;">
            <table>
                <tr>
                    <td>Bill ID:</td>
                    <td><strong>${data.data.billId}</strong></td>
                </tr>
                <tr>
                    <td>Bill Date:</td>
                    <td><strong>${data.data.billDate}</strong></td>
                </tr>
            </table>
        </div>
        <div style="display: inline-block; width: 48%;">
            <div class="qr-code">
                <img src="${barcodeData}" alt="Barcode" style="width: 50%; max-width: 200px;" />
            </div>
        </div>
        <hr style="border-top: 1px solid #000; margin: 10px 0 0;">
        <div class="row">
            <div class="col-12">
                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th style="width: 10%; text-align:left">Sl No.</th>
                            <th style="width: 60%; text-align:left">Test Name</th>
                            <th style="width: 30%; text-align:right">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.feesData.map((details) => (
                            `<tr>
                                <td style="text-align:left; font-size:13px">${serialNumber++}</td>
                                <td style="text-align:left; font-size:13px">${details.feesType}</td>
                                <td style="text-align:right; font-size:13px">${details.fees}</td>
                            </tr>`
                        )).join('')}
                    </tbody>
                </table>
                <hr style="border-top: 1px solid #000; margin: 0;">
            </div>
        </div>
        <div class="row" style="margin-top: 10px;">
            <div class="col-6"></div>
            <div class="col-6" style="text-align:right;">
                <span> Grand Total: ${data.data.billAmount}</span><br>
                <span> Paid: ${data.data.amountPaid}</span><br>
                <span> Due: ${data.data.amountDue}</span><br>
            </div>
        </div>
    `;

    return billDetailsHTML;
};


export default bill





