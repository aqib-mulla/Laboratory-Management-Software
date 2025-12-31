import Bill from "../models/Bill.js";
import BillDetail from "../models/BillDetails.js";
import GroupTest from "../models/GroupTest.js";
import Test from "../models/Tests.js";
import CreateProfile from "../models/CreateProfile.js";
import labResultDetail from "../models/labResultDetail.js";
import labResult from "../models/labResult.js";
import PatientReg from "../models/PatientReg.js";
import puppeteer from 'puppeteer-core';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import pdf from 'html-pdf';



// export const bill = async (req, res) => {
//     res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
//     try {
//         async function getBillsWithDetails() {
//             const billsWithDetails = await Bill.find()
//                 .populate('refId', 'pName pNum pAge pGender pSalutation') // Reference to the PatientReg model, selecting only pName and pNum fields
//                 .populate('doctorName', 'drName') // Reference to the Doctor model, selecting only doctorName field
//                 .exec();

//             const formattedBills = billsWithDetails.map(bill => ({
//                 objbillId: bill._id,
//                 pName: bill.refId.pName,
//                 pSal: bill.refId.pSalutation,
//                 pNum: bill.refId.pNum,
//                 drName: bill.doctorName.drName,
//                 billId: bill.billId,
//                 billDate: formatDate(bill.createdAt),
//                 billAmount: bill.billAmount,
//                 amountDue: bill.amountDue,
//                 amountPaid: bill.amountPaid,
//                 discountAmount: bill.discountAmount,

//                 // ... other bill details
//             }));

//             res.status(200).json({ bills: formattedBills });
//         }

//         await getBillsWithDetails();

//         function formatDate(dateString) {
//             const date = new Date(dateString);
//             const day = date.getDate();
//             const month = date.getMonth() + 1; // Adding 1 because getMonth() returns 0-based index
//             const year = date.getFullYear();
//             return `${day}/${month}/${year}`;
//         }

//     } catch (error) {
//         console.error('Error fetching bills:', error);
//         res.status(500).json({ error: 'Failed to fetch bills' });
//     }
// }

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


// export const collectDueAmount = async (req, res) => {

//     const billId = req.params.id;
//     const { dueAmount } = req.body;

//     try {
//         // Find the bill by its ID
//         const bill = await Bill.findById(billId);

//         if (!bill) {
//             return res.status(404).json({ error: 'Bill not found' });
//         }

//         if (dueAmount > bill.amountDue) {
//             return res.status(400).json({ error: 'Collected amount cannot be greater than the due amount' });
//         }

//         // Subtract the collected amount from the due amount
//         bill.amountDue -= dueAmount;

//         bill.amountPaid += dueAmount;


//         // Save the updated bill
//         await bill.save();


//         return res.json({ message: 'Due amount updated successfully' });
//     } catch (error) {
//         console.error('Error updating due amount:', error);
//         return res.status(500).json({ error: 'An error occurred while updating due amount' });
//     }
// }

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

// export const updatebillTest = async (req, res) => {

//     const billId = req.params.id;

//     try {
//         const { selectedTests } = req.body;

//         // Find the Bill document by ID
//         const bill = await Bill.findById(billId);

//         if (!bill) {
//             return res.status(404).json({ error: 'Bill not found' });
//         }


//         // Calculate the total fees of selected tests
//         let totalFees = 0;
//         selectedTests.forEach((test) => {
//             if (test.fees) {
//                 totalFees += parseFloat(test.fees); // Parse fees as a float
//             } else if (test.profilePrice) {
//                 totalFees += parseFloat(test.profilePrice); // Parse profilePrice as a float
//             } else if (test.groupPrice) {
//                 totalFees += parseFloat(test.groupPrice); // Parse groupPrice as a float
//             }
//         });

//         // Update the amountDue field with the calculated total fees
//         bill.amountDue += totalFees;
//         bill.billAmount += totalFees;


//         // Create an array to store BillDetail entries for selected tests
//         const billDetailPromises = selectedTests.map(async (test) => {
//             const { _id, type, fees, profilePrice, groupPrice /* ... */ } = test;

//             const billDetail = new BillDetail({
//                 refBillId: billId,
//                 testId: _id,
//                 type,
//                 fees: fees || profilePrice || groupPrice,
//                 // ... other properties
//             });
//             return await billDetail.save();
//         });

//         // Wait for all BillDetail promises to resolve
//         await Promise.all(billDetailPromises);

//         // Save the updated Bill with the new amountDue
//         await bill.save();

//         // Respond with saved data
//         res.status(201).json({ message: 'Bill and BillDetail updated successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// }

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


// export const deleteBill = async (req, res) => {
//     try {
//         // Extract the billId from the request parameters
//         const billId = req.params.id;

//         // First, find and delete related BillDetail documents
//         const billDetailsToDelete = await BillDetail.find({ refBillId: billId });

//         // Delete related LabResultDetails documents based on objbillId
//         const labResultDetailsIdsToDelete = billDetailsToDelete.map((detail) => detail.refBillId);
//         await labResultDetail.deleteMany({ objbillId: { $in: labResultDetailsIdsToDelete } });

//         // Now, delete related LabResult documents based on objbillId
//         await labResult.deleteMany({ objbillId: { $in: labResultDetailsIdsToDelete } });



//         // Finally, delete the Bill and BillDetail documents
//         await BillDetail.deleteMany({ refBillId: billId });

//         // Find the Bill document by _id
//         const billToDelete = await Bill.findById(billId);

//         if (!billToDelete) {
//             return res.status(404).json({ error: 'Bill not found' });
//         }

//         // Find the associated PatientReg document by _id from the refId field in Bill
//         const patientRegIdToDelete = billToDelete.refId;

//         if (patientRegIdToDelete) {
//             // Delete the PatientReg document
//             await PatientReg.findByIdAndDelete(patientRegIdToDelete);
//         }

//         await Bill.findByIdAndDelete(billId);

//         res.status(200).json({ message: 'Bill and its details deleted successfully' });
//     } catch (error) {
//         console.error('Error deleting bill and details:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };

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


export const billPrint = async (req, res) => {

    try {

        const id = req.params.id;

        // Assuming you have the billData available
        const billData = await getBillDetails(id);

        // Generate the PDF for the bill
        const pdfBuffer = await generateBillPDF(billData);

        // Set response headers to indicate PDF content
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=bill.pdf');

        // Send the PDF as a response
        //   res.send(pdfBuffer);
        res.status(200).end(pdfBuffer);

    } catch (error) {
        console.error('Error printing bill:', error);
        res.status(500).json({ error: 'Failed to print bill' });
    }
};

// const generateBillPDF = async (data) => {
//     const browser = await puppeteer.launch({
//         executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/Chrome.exe',
//     });

//     const page = await browser.newPage();

//     // Create an HTML template with the lab report data
//     let serialNumber = 1; // Initialize the serial number

//     const billDetailsHTML = `
//     <!-- Additional details at the bottom -->
//     <div style="text-align: center;">
//       <span style="font-weight: bold; font-size: 30px;">MEMOCARES</span> <br> <br>
//       <span>46/4, Hosur Rd, Kudlu Gate, Krishna Reddy Industrial Area, H.S</span><br>
//       <span>, R Extension, Bengaluru, Karnataka 560068</span><br>
//       <span>Email: memocares@gmail.com</span><br>
//       <span>PH: 7845124578 </span>
//       <h5 style="text-align:center">BILL RECEIPT</h5>
//       <hr style="border-top: 1px solid #000; margin: 0;">
//     </div>

//       <div style="display: inline-block; width: 48%;margin: 10px 0 0 ">

//       <table>
//       <tr>
//           <td>Patient Name:</td>
//           <td><strong>${data.data.pSal}. ${data.data.pName}</strong></td>
//       </tr>
//       <tr>
//           <td>Sex / Age:</td>
//           <td><strong>${data.data.pGender} / ${data.data.pAge}</strong></td>
//       </tr>
//       <tr>
//           <td>Referred By:</td>
//           <td><strong>${data.data.drName}</strong></td>
//       </tr>
//   </table>
// </div>

// <div style="display: inline-block; width: 48%;">
//   <table>
//       <tr>
//           <td>Bill ID:</td>
//           <td><strong>${data.data.billId}</strong></td>
//       </tr>
//       <tr>
//           <td>Bill Date:</td>
//           <td><strong>${data.data.billDate}</strong></td>
//       </tr>
//   </table>
// </div>

// <hr style="border-top: 1px solid #000;  margin: 10px 0 0;">
//       <div class="row">
//         <div class="col-12">
//           <table style="width: 100%;">
//             <thead>
//               <tr>
//                 <th style="width: 10% ;text-align:left">Sl No.</th>
//                 <th style="width: 60%;text-align:left">Test Name</th>
//                 <th style="width: 30%; text-align:right">₹ Price</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${data.feesData.map((details) => (
//         `<tr>
//                   <td style="text-align:left;font-size:13px">${serialNumber++}</td>
//                   <td style="text-align:left;font-size:13px">${details.feesType}</td>
//                   <td style="text-align:right;font-size:13px">₹${details.fees}</td>
//                 </tr>`
//     )).join('')}
//             </tbody>
//           </table>
//           <!-- Underline -->
//           <hr style="border-top: 1px solid #000; margin: 0;">
//         </div>
//       </div>
//       <div class="row" style="margin-top: 10px;">
//         <div class="col-6">
       
//         </div>
//         <div class="col-6" style="text-align:right">
//           <span> Grand Total: ₹${data.data.billAmount}</span><br>
//           <span> Paid: ₹${data.data.amountPaid}</span><br>
//           <span> Due: ₹${data.data.amountDue}</span><br>
//         </div>
//       </div>
     
//     `;
//     await page.setContent(billDetailsHTML);

//     // Generate a PDF with custom margin options
//     const pdfBuffer = await page.pdf({
//         format: 'A4',
//         margin: {
//             top: '10mm',    // Specify the top margin
//             bottom: '10mm', // Specify the bottom margin
//             left: '10mm',   // Specify the left margin
//             right: '10mm',  // Specify the right margin
//         },
//     });

//     // Close the browser
//     await browser.close();

//     return pdfBuffer;
// }

// const generateBillPDF = async (data) => {
//     // Create a new PDF document
//     const pdfDoc = await PDFDocument.create();
//     const page = pdfDoc.addPage();

//     // Set up font and text size
//     const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
//     const fontSize = 12;

//     // Function to add text to the page
//     const addText = (text, x, y) => {
//         page.drawText(text, {
//             x,
//             y,
//             size: fontSize,
//             font: helveticaFont,
//             color: rgb(0, 0, 0),
//         });
//     };

//     // Function to add table to the page
//     const addTable = (tableData, startX, startY) => {
//         let y = startY;
//         tableData.forEach(row => {
//             let x = startX;
//             row.forEach(cell => {
//                 addText(cell.text, x, y);
//                 x += cell.width;
//             });
//             y -= fontSize;
//         });
//     };

//     // Set up table data
//     let tableData = [
//         [{ text: 'Sl No.', width: 100 }, { text: 'Test Name', width: 300 }, { text: ' Price', width: 100 }],
//         ...data.feesData.map((details, index) => {
//             return [
//                 { text: `${index + 1}`, width: 100 },
//                 { text: details.feesType, width: 300 },
//                 { text: `${details.fees}`, width: 100 }
//             ];
//         })
//     ];

//     // Add content to the PDF
//     addText('MEMOCARES', 50, 750);
//     addText('46/4, Hosur Rd, Kudlu Gate, Krishna Reddy Industrial Area, H.S', 50, 730);
//     addText('R Extension, Bengaluru, Karnataka 560068', 50, 710);
//     addText('Email: memocares@gmail.com', 50, 690);
//     addText('PH: 7845124578', 50, 670);
//     addText('BILL RECEIPT', 50, 650);

//     addTable(tableData, 50, 600);

//     addText(`Grand Total: ${data.data.billAmount}`, 50, 100);
//     addText(`Paid: ${data.data.amountPaid}`, 50, 80);
//     addText(`Due: ${data.data.amountDue}`, 50, 60);

//     // Serialize the PDF
//     const pdfBytes = await pdfDoc.save();

//     return pdfBytes;
// };

const generateBillPDF = async (data) => {
    // Create an HTML template with the lab report data
    let serialNumber = 1; // Initialize the serial number

    const billDetailsHTML = `
    <!-- Additional details at the bottom -->
    <div style="text-align: center;">
      <span style="font-weight: bold; font-size: 30px;">MEMOCARES</span> <br> <br>
      <span>46/4, Hosur Rd, Kudlu Gate, Krishna Reddy Industrial Area, H.S</span><br>
      <span>, R Extension, Bengaluru, Karnataka 560068</span><br>
      <span>Email: memocares@gmail.com</span><br>
      <span>PH: 7845124578 </span>
      <h5 style="text-align:center">BILL RECEIPT</h5>
      <hr style="border-top: 1px solid #000; margin: 0;">
    </div>

    <div style="display: inline-block; width: 48%;margin: 10px 0 0 ">
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

    <hr style="border-top: 1px solid #000;  margin: 10px 0 0;">
    <div class="row">
      <div class="col-12">
        <table style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 10% ;text-align:left">Sl No.</th>
              <th style="width: 60%;text-align:left">Test Name</th>
              <th style="width: 30%; text-align:right">₹ Price</th>
            </tr>
          </thead>
          <tbody>
            ${data.feesData.map((details) => (
              `<tr>
                <td style="text-align:left;font-size:13px">${serialNumber++}</td>
                <td style="text-align:left;font-size:13px">${details.feesType}</td>
                <td style="text-align:right;font-size:13px">₹${details.fees}</td>
              </tr>`
            )).join('')}
          </tbody>
        </table>
        <!-- Underline -->
        <hr style="border-top: 1px solid #000; margin: 0;">
      </div>
    </div>
    <div class="row" style="margin-top: 10px;">
      <div class="col-6"></div>
      <div class="col-6" style="text-align:right">
        <span> Grand Total: ₹${data.data.billAmount}</span><br>
        <span> Paid: ₹${data.data.amountPaid}</span><br>
        <span> Due: ₹${data.data.amountDue}</span><br>
      </div>
    </div>
    `;

    // Define options for the PDF generation
    const options = {
        format: 'A4',
        border: {
            top: '10mm',
            bottom: '10mm',
            left: '10mm',
            right: '10mm'
        }
    };

    return new Promise((resolve, reject) => {
        // Generate the PDF from HTML
        pdf.create(billDetailsHTML, options).toBuffer((err, buffer) => {
            if (err) {
                reject(err);
            } else {
                resolve(buffer);
            }
        });
    });
};


  
export const downloadBackup = async (req, res) => {
    const backupDir = 'backup'; // Specify the backup directory
    const timestamp = new Date().toISOString().replace(/:/g, '-'); // Create a timestamp for the backup
    const backupFileName = `backup-${timestamp}`;

    // Replace <your_connection_string> with your MongoDB cluster connection string
    const backupCommand = `mongodump --uri "mongodb+srv://aqibmulla456:aqib1234@cluster0.xpvhvm4.mongodb.net/LMS?retryWrites=true&w=majority" --out ${backupDir}/${backupFileName}`;

    // Use the full path to the zip executable, e.g., "C:\\Program Files\\7-Zip\\7z.exe"
    const zipExecutablePath = 'C:\\Program Files\\WinRAR\\WinRAR.exe';

    exec(backupCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Backup failed: ${error}`);
            return res.status(500).json({ error: 'Backup failed' });
        }

        // Compress the backup files into a .zip archive using the full path to the zip executable
        exec(`${zipExecutablePath} a -r ${backupDir}/${backupFileName}.zip ${backupDir}/${backupFileName}`, (zipError) => {
            if (zipError) {
                console.error(`Zip compression failed: ${zipError}`);
                return res.status(500).json({ error: 'Backup compression failed' });
            }

            console.log(`Backup successful: ${stdout}`);
            res.download(`${backupDir}/${backupFileName}.zip`);
        });
    });
}
  
export default bill