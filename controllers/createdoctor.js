import doctorDetail from "../models/CreateDoctor.js"
import GroupTest from "../models/GroupTest.js";
import Test from "../models/Tests.js";
import Bill from "../models/Bill.js";
import BillDetail from "../models/BillDetails.js";
import Referral from "../models/Referral.js";
import XLSX from 'xlsx';



export const createdoctor = async (req, res) => {

  try {
    console.log(req.body)
    const { doctorDetails } = req.body;
    const { docId, drName, drGender, drEmail, drNum, drAddress } = doctorDetails;
    const doctor = new doctorDetail({ docId, drName, drGender, drEmail, drNum, drAddress });
    // console.log('Doctor object:', doctor);
    const doctorSaved = await doctor.save();
    res.status(201).json(doctorSaved);
  } catch (err) {
    res.status(500).json("error :", err);
  }
}



export const getdoctor = async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const doctors = await doctorDetail.find();
    // console.log('Fetched tests:', doctors);
    res.json(doctors);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
}


export const updatedoctor = async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const doctors = await doctorDetail.find(_id);
    // console.log('Fetched tests:', doctors);
    res.json(doctors);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
}

export const getDoctorById = async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  try {
    const doctorId = req.params.id; // Get the doctor id from the route parameter
    const doctor = await doctorDetail.findById(doctorId); // Use findById to fetch a doctor by id
    // console.log('Fetched doctor:', doctor);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
}


export const updateDoctor = async (req, res) => {
  const doctorId = req.params.id;
  const updatedData = req.body;
  // console.log(updatedData);

  try {
    const updatedDoctor = await doctorDetail.findByIdAndUpdate(
      doctorId,
      updatedData,
      { new: true }
    );

    res.json(updatedDoctor);
  } catch (error) {
    res.status(500).json({ error: 'Error updating doctor' });
  }
};


export const deleteDoctor = async (req, res) => {
  const { doctorId } = req.params;

  try {
    const deletedDoctor = await doctorDetail.findByIdAndDelete(doctorId);

    if (!deletedDoctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ error: 'An error occurred while deleting the doctor' });
  }
};

// export const getRef = async (req, res) => {
//     const { id } = req.params;

//   try {
//     const referrals = await Referral.find({ doctor_id: id })
//       .populate('test_id', 'name test_type')
//       .select('test_id test_type amount type');

//     const result = referrals.map((referral) => ({
//       id: referral.test_id,
//       test: referral.name,
//       type: referral.test_type,
//       refAmt: referral.amount,
//       refType: referral.type,
//     }));

//     res.json(result);
//   } catch (error) {
//     console.error('Error fetching data:', error);
//     res.status(500).send('Internal Server Error');
//   }
// };


// export const getRef = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const doctorReferrals = await Referral.find({ doctor_id: id });
   

//     if (doctorReferrals.length > 0) {
//       const testIds = doctorReferrals.map((referral) => referral.test_id);

//       const groupTests = await GroupTest.find({ _id: { $in: testIds } }, 'groupName').lean();
//       const individualTests = await Test.find({ _id: { $in: testIds } }, 'name').lean();

//       const result = doctorReferrals.map((referral) => {
//         const groupTestInfo = groupTests.find((groupTest) => groupTest._id.toString() === referral.test_id.toString());
//         const individualTestInfo = individualTests.find((individualTest) => individualTest._id.toString() === referral.test_id.toString());

//         const testName = groupTestInfo ? groupTestInfo.groupName : (individualTestInfo ? individualTestInfo.name : 'Test Not Found');

//         return {
//           id: referral.test_id,
//           test: testName,
//           type: referral.test_type,
//           refAmt: referral.amount,
//           refType: referral.type,
//         };
//       });

//       res.json(result);
//     }

//     else {
//       // If the doctor has no referrals, get test names from Group and Test models with default values
//       const groupTests = await GroupTest.find({}, 'groupName').lean();
//       const individualTests = await Test.find({}, 'name').lean();

//       const result = [
//         ...groupTests.map((groupTest) => ({
//           id: groupTest._id,
//           test: groupTest.groupName,
//           type: 'Group', // Assigning 'Group' as the test_type for Group model
//           refAmt: 0,
//           refType: 'Percentage',
//         })),
//         ...individualTests.map((individualTest) => ({
//           id: individualTest._id,
//           test: individualTest.name,
//           type: 'Test', // Assigning 'Test' as the test_type for Test model
//           refAmt: 0,
//           refType: 'Percentage',
//         })),
//       ];

//       res.json(result);
//     }
//   } catch (error) {
//     console.error('Error fetching data:', error);
//     res.status(500).send('Internal Server Error');
//   }
// };

export const getRef = async (req, res) => {
  const { id } = req.params;

  try {
    const doctorReferrals = await Referral.find({ doctor_id: id });
   

    if (doctorReferrals.length > 0) {
      const testIds = doctorReferrals.map((referral) => referral.test_id);

      const groupTests = await GroupTest.find({ _id: { $in: testIds } }, 'groupName').lean();
      const individualTests = await Test.find({ _id: { $in: testIds } }, 'name').lean();

      const result = doctorReferrals.map((referral) => {
        const groupTestInfo = groupTests.find((groupTest) => groupTest._id.toString() === referral.test_id.toString());
        const individualTestInfo = individualTests.find((individualTest) => individualTest._id.toString() === referral.test_id.toString());

        const testName = groupTestInfo ? groupTestInfo.groupName : (individualTestInfo ? individualTestInfo.name : 'Test Not Found');

        return {
          id: referral.test_id,
          test: testName,
          type: referral.test_type,
          refAmt: referral.amount,
          refType: referral.type,
        };
      });

      res.json(result);
    }

    else {
      // If the doctor has no referrals, get test names from Group and Test models with default values
      const groupTests = await GroupTest.find({}, 'groupName').lean();
      const individualTests = await Test.find({}, 'name').lean();

      const result = [
        ...groupTests.map((groupTest) => ({
          id: groupTest._id,
          test: groupTest.groupName,
          testType: 'Group', // Assigning 'Group' as the test_type for Group model
          refAmt: 0,
          refType: 'Percentage',
        })),
        ...individualTests.map((individualTest) => ({
          id: individualTest._id,
          test: individualTest.name,
          testType: 'Test', // Assigning 'Test' as the test_type for Test model
          refAmt: 0,
          refType: 'Percentage',
        })),
      ];

      res.json(result);
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
};




// export const updateRef = async (req, res) => {
//   const { doctorId, tests } = req.body;

//   try {
//     await Promise.all(
//       tests.map(async (testData) => {
//         const { id, refAmt, refType } = testData;

//         // Check if there is an existing record for the doctor_id and test_id
//         const existingReferral = await Referral.findOne({
//           doctor_id: doctorId,
//           test_id: id,
//         });

//         if (existingReferral) {
//           // Update the existing record
//           await Referral.updateOne(
//             { doctor_id: doctorId, test_id: id },
//             { $set: { amount: refAmt, type: refType } }
//           );
//         } else {
//           // Insert a new record if the combination doesn't exist
//           await Referral.create({
//             doctor_id: doctorId,
//             test_id: id,
//             amount: refAmt,
//             type: refType,
//           });
//         }
//       })
//     );

//     res.status(200).json({ message: 'Referrals updated successfully' });
//   } catch (error) {
//     console.error('Error updating referrals:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

export const updateRef = async (req, res) => {
  const { doctorId, tests } = req.body;

  try {
    await Promise.all(
      tests.map(async (testData) => {
        const { id, refAmt, refType, testType } = testData;

        // Check if there is an existing record for the doctor_id and test_id
        const existingReferral = await Referral.findOne({
          doctor_id: doctorId,
          test_id: id,
        });

        if (existingReferral) {
          // Update the existing record
          await Referral.updateOne(
            { doctor_id: doctorId, test_id: id },
            { $set: { amount: refAmt, type: refType, test_type: testType } }
          );
        } else {
          // Insert a new record if the combination doesn't exist
          await Referral.create({
            doctor_id: doctorId,
            test_id: id,
            amount: refAmt,
            type: refType,
            test_type: testType
          });
        }
      })
    );

    res.status(200).json({ message: 'Referrals updated successfully' });
  } catch (error) {
    console.error('Error updating referrals:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getReferrals = async (req, res) => {
  try {
    const id = req.body.consultant;
    const start = req.body.start;
    const end = req.body.end;

    // Fetch bills
    const formattedBills = await fetchFormattedBills(id, start, end);

    // Fetch commissions
    const commissions = await getCommissions(id);

    // Prepare the response data
    const data = {
      bills: formattedBills,
      commissions: commissions,
      Header: `Referral Report of ${await getConsultantName(id)} from ${start} to ${end}`,
    };

    // console.log(data);

    const workbook = generateSpreadsheet(data);

    // Convert the workbook to a buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Set the response headers for downloading the file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ReferralReport.xlsx`);
 
    // Send the buffer as the response
    res.end(Buffer.from(buffer));
     

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

async function getConsultantName(id) {
  try {
    const row = await doctorDetail.findById(id);

    return row ? row.drName : '';
  } catch (error) {
    console.error('Error fetching consultant name:', error);
    throw error;
  }
}

const fetchFormattedBills = async (id, start, end) => {
  try {
    // Format start and end dates before using them in the MongoDB query
    const formattedStartDate = new Date(start).toISOString();
    const formattedEndDate = new Date(end).toISOString();

     // Fetch commissions and await the result
    const commissions = await getCommissions(id)

    const bills = await Bill.find({
      doctorName: id,
      createdAt: { $gte: new Date(formattedStartDate), $lte: new Date(formattedEndDate) },
    });

    const formattedBills = [];
    for (const bill of bills) {
      const date = new Date(bill.createdAt).toLocaleDateString(); // Format the date

      const billDetails = await BillDetail.find({ refBillId: bill._id });


      if (billDetails.length > 0) {
        // console.log(billDetails[0].testId);
        const commissionValues = getCommissionValues(billDetails[0].testId, billDetails[0].type, commissions);
        console.log(commissionValues);
        const fees = parseFloat(billDetails[0].fees);
        // const discount = parseFloat(billDetails[0].discount);

        let referralAmount = 0;
        if (commissionValues[2] === 'Percentage') {
          referralAmount = (fees) * (commissionValues[1] / 100);
        } else {
          referralAmount = commissionValues[1];
        }

        formattedBills.push({
          id: bill._id,
          billNo: bill.billId, // Add bill number
          date: date, // Add bill date
          // testName: commissionValues[0], // Add test name
          fees: fees,
          // discount: discount,
          type: billDetails[0].type,
          created_at: date,
          referralAmount: referralAmount, // Add referral amount
        });
      }
    }
    return formattedBills;
  } catch (error) {
    console.error('Error fetching bills:', error);
    throw error;
  }
};


const getCommissions = async (id) => {
  try {
    const referrals = await Referral.find({ doctor_id: id });

    const commissions = referrals.map(referral => ({
      id: referral.test_id,
      amount: referral.amount,
      amount_type: referral.type,
      test_type: referral.test_type,
    }));

    return commissions;
  } catch (error) {
    console.error('Error fetching commissions:', error);
    throw error;
  }
};

const getCommissionValues = (id, type, commissions) => {

  const filtered = commissions.filter(val =>  val.id.equals(id) && val.test_type === type);
  const name = getFeesType(id, type);

  const first = filtered.length > 0 ? filtered[0] : {
    amount: 0,
    amount_type: 'Amount'
  };

  return [name, first.amount, first.amount_type];
};


 const  getFeesType =  async(id, type) => {
  try {
      switch (type) {
          case 'Test':
              return await Test.findById(id, 'name');
          case 'Group':
              return await GroupTest.findById(id, 'groupName');
          default:
              return null;
      }
  } catch (error) {
      console.error('Error fetching fees type:', error);
      return null;
  }
}

// const generateSpreadsheet = (data) => {
//   const header = [data.Header];
//   const columns = ['Bill No', 'Bill Date', 'Fees', 'Referral Amount'];
//   const rows = [columns];

//   // Assuming that 'bills' contains an array of objects with appropriate properties
//   data.bills.forEach((bill) => {
//     // Format the date as a string in a way that Excel recognizes
//     const formattedDate = new Date(bill.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
//     rows.push([bill.billNo, formattedDate, bill.fees, bill.referralAmount]);
//   });

//   // Add total row
//   const totals = ['Total', '', '', `=SUM(C2:C${data.bills.length + 1})`, `=SUM(D2:D${data.bills.length + 1})`];
//   rows.push(totals);

//   // Create worksheet
//   const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

//   // Create workbook and add worksheet
//   const wb = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');

//   return wb;
// };

const generateSpreadsheet = (data) => {
  const header = [data.Header];
  const columns = ['Bill No', 'Bill Date', 'Fees', 'Referral Amount'];
  const rows = [columns];

  let totalFees = 0;
  let totalReferralAmount = 0;

  // Assuming that 'bills' contains an array of objects with appropriate properties
  data.bills.forEach((bill) => {
    // Format the date as a string in a way that Excel recognizes
    const formattedDate = new Date(bill.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

    // Add data to rows
    rows.push([bill.billNo, formattedDate, bill.fees, bill.referralAmount]);

    // Accumulate totals
    totalFees += bill.fees;
    totalReferralAmount += bill.referralAmount;
  });

  // Add total row
  const totals = ['Total', '', totalFees, totalReferralAmount];
  rows.push(totals);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  // Make the total row bold
  ws['!rows'] = [{ hpx: 18, bold: true }];

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');

  return wb;
};

export default createdoctor