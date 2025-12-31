import Bill from "../models/Bill.js";
import Test from "../models/Tests.js";
import GroupTest from "../models/GroupTest.js";
import PatientReg from "../models/PatientReg.js";
import XLSX from 'xlsx';
import fs from 'fs';// Import the xlsx library
import labResultDetail from "../models/labResultDetail.js";
import CreateProfile from "../models/CreateProfile.js";
import BillDetail from "../models/BillDetails.js";
import FormData from 'form-data';
import axios from "axios";

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

const dailyCollectionreport = async (req, res) => {
    const date = req.params.date;

    try {
        // Convert the date parameter to a JavaScript Date object
        const selectedDate = new Date(date);

        // Set the time range for the selected date (from midnight to midnight)
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);

        // Use the createdAt field in the Bill model to query data
        const dailyCollectionData = await Bill.find({
            createdAt: { $gte: startDate, $lte: endDate },
        })
            .populate('refId', 'pName pNum pAge pGender pSalutation')
            .populate('doctorName', 'drName'); // Reference to the Doctor model, selecting only doctorName field

        // Format the createdAt field as "day month year"
        const formattedData = dailyCollectionData.map(item => {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = new Intl.DateTimeFormat('en-US', options).format(item.createdAt);
            return {
                ...item.toObject(),
                createdAt: formattedDate,
            };
        });

        // Respond with the fetched data
        res.json(formattedData);
    } catch (error) {
        console.error('Error fetching daily collection data:', error);
        res.status(500).json({ error: 'An error occurred while fetching data' });
    }

}

// export const monthlyCollectionreport = async (req, res) => {

//     try {
//         const selectedMonth = req.params.month;

//         // Parse the selectedMonth into a Date object
//         const selectedDate = new Date(selectedMonth);

//         // Calculate the start and end dates for the selected month
//         const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
//         const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

//         // Query the database to retrieve daily collection records for the selected month
//         const monthlyCollectionData = await Bill.find({
//             createdAt: { $gte: startOfMonth, $lte: endOfMonth },
//         })
//             .populate('refId', 'pName pNum pAge pGender pSalutation')
//             .populate('doctorName', 'drName'); // Reference to the Doctor model, selecting only doctorName field

//         // Respond with the fetched data
//         res.json(monthlyCollectionData);
//     } catch (error) {
//         console.error('Error fetching monthly collection data:', error);
//         res.status(500).json({ error: 'An error occurred while fetching monthly collection data' });
//     }

// }



export const monthlyCollectionreport = async (req, res) => {
    try {
        const selectedMonth = req.params.month;

        // Parse the selectedMonth into a Date object
        const selectedDate = new Date(selectedMonth);

        // Calculate the start date for the selected month (1st day)
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);

        // Calculate the end date for the selected month (last day)
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);

        // Query the database to retrieve daily collection records for the selected month
        const monthlyCollectionData = await Bill.find({
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        })
            .populate('refId', 'pName pNum pAge pGender pSalutation')
            .populate('doctorName', 'drName');

        // Format the createdAt field as "day month year"
        const formattedData = monthlyCollectionData.map(item => {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = new Intl.DateTimeFormat('en-US', options).format(item.createdAt);
            return {
                ...item.toObject(),
                createdAt: formattedDate,
            };
        });

        // Respond with the fetched data
        res.json(formattedData);
    } catch (error) {
        console.error('Error fetching monthly collection data:', error);
        res.status(500).json({ error: 'An error occurred while fetching monthly collection data' });
    }
}

export const monthlydueCollectionreport = async (req, res) => {

    try {
        const selectedMonth = req.params.month;

        // Parse the selectedMonth into a Date object
        const selectedDate = new Date(selectedMonth);

        // Calculate the start and end dates for the selected month
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);

        // const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

        // Calculate the end date for the selected month (last day)
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);

        // Query the database to retrieve daily collection records for the selected month
        const monthlyCollectionData = await Bill.find({
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            amountDue: { $gt: 0 },
        })
            .populate('refId', 'pName pNum pAge pGender pSalutation')
            .populate('doctorName', 'drName'); // Reference to the Doctor model, selecting only doctorName field

             // Format the createdAt field as "day month year"
        const formattedData = monthlyCollectionData.map(item => {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = new Intl.DateTimeFormat('en-US', options).format(item.createdAt);
            return {
                ...item.toObject(),
                createdAt: formattedDate,
            };
        });

        // Respond with the fetched data
        res.json(formattedData);
    } catch (error) {
        console.error('Error fetching monthly collection data:', error);
        res.status(500).json({ error: 'An error occurred while fetching monthly collection data' });
    }

}

export const downloadDailyCollection = async (req, res) => {
    const date = req.params.date;

    try {
        // Convert the date parameter to a JavaScript Date object
        const selectedDate = new Date(date);

        // Set the time range for the selected date (from midnight to midnight)
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);

        // Use the createdAt field in the Bill model to query data
        const dailyCollectionData = await Bill.find({
            createdAt: { $gte: startDate, $lte: endDate },
        })
            .populate('refId', 'pName pNum pAge pGender pSalutation')
            .populate('doctorName', 'drName');

        // Define custom column names
        const columns = [
            'Date',
            'Bill ID',
            'Patient Name',
            'Doctor Name',
            'Bill Amount',
            'Discount',
            'Revenue',
        ];

        // Map the data to an array of arrays
        const data = dailyCollectionData.map(item => [
            formatDate(item.createdAt),
            item.billId,
            `${item.refId.pSalutation}. ${item.refId.pName}`,
            item.doctorName.drName,
            item.billAmount,
            item.discountAmount,
            item.amountPaid,
        ]);

        // Create a new Excel workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([columns, ...data]);

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Collection');

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set the response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="daily-collection.xlsx"');

        // Send the buffer as the response
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Error fetching daily collection data:', error);
        res.status(500).json({ error: 'An error occurred while fetching data' });
    }
}

export const downloadMonthlyCollection = async (req, res) => {

    try {
        const selectedMonth = req.params.month;

        // Parse the selectedMonth into a Date object
        const selectedDate = new Date(selectedMonth);

        // Calculate the start and end dates for the selected month
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        // const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);


        // Query the database to retrieve daily collection records for the selected month
        const monthlyCollectionData = await Bill.find({
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        })
            .populate('refId', 'pName pNum pAge pGender pSalutation')
            .populate('doctorName', 'drName'); // Reference to the Doctor model, selecting only doctorName field

        // // Respond with the fetched data
        // res.json(monthlyCollectionData);

        // Define custom column names
        const columns = [
            'Date',
            'Bill ID',
            'Patient Name',
            'Doctor Name',
            'Bill Amount',
            'Discount',
            'Revenue',
        ];

        // Map the data to an array of arrays
        const data = monthlyCollectionData.map(item => [
            formatDate(item.createdAt),
            item.billId,
            `${item.refId.pSalutation}. ${item.refId.pName}`,
            item.doctorName.drName,
            item.billAmount,
            item.discountAmount,
            item.amountPaid,
        ]);

        // Create a new Excel workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([columns, ...data]);

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Collection');

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set the response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="monthly-collection.xlsx"');

        // Send the buffer as the response
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error('Error fetching monthly collection data:', error);
        res.status(500).json({ error: 'An error occurred while fetching monthly collection data' });
    }

}


export const downloadTestList = async (req, res) => {
    try {
        // Query the database to retrieve the list of tests
        const testList = await Test.find({});

        // Define custom column names
        const columns = [
            'Category',
            'Name',
            'Method',
            'Sample',
            'Reference Range',
            'Fees',
        ];

        // Map the test data to an array of arrays
        const data = testList.map(test => [
            test.category,
            test.name,
            test.method,
            test.sample,
            test.reference_range,
            test.fees,
        ]);

        // Create a new Excel workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([columns, ...data]);

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Test List');

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set the response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="test-list.xlsx"');

        // Send the buffer as the response
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Error fetching test list data:', error);
        res.status(500).json({ error: 'An error occurred while fetching test list data' });
    }
}

export const downloadGroupList = async (req, res) => {
    try {
        // Query the database to retrieve the list of tests
        const testList = await GroupTest.find({});

        // Define custom column names
        const columns = [
            'Category',
            'Name',
            'Fees',
        ];

        // Map the test data to an array of arrays
        const data = testList.map(test => [
            test.groupCategory,
            test.groupName,
            test.groupPrice,
        ]);

        // Create a new Excel workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([columns, ...data]);

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Test List');

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set the response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="test-list.xlsx"');

        // Send the buffer as the response
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Error fetching test list data:', error);
        res.status(500).json({ error: 'An error occurred while fetching test list data' });
    }
}

export const dailyRegistration = async (req, res) => {
    const { startDate, endDate } = req.params;

    try {
        // Convert the date parameter to a JavaScript Date object
        // const selectedDate = new Date(date);

        // Set the time range for the selected date (from midnight to midnight)
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Use the createdAt field in the Bill model to query data
        const dailyCollectionData = await PatientReg.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        })

        // Format the createdAt field as "day month year"
        const formattedData = dailyCollectionData.map(item => {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = new Intl.DateTimeFormat('en-US', options).format(item.createdAt);
            return {
                ...item.toObject(),
                createdAt: formattedDate,
            };
        });

        // Respond with the fetched data
        res.json(formattedData);
    } catch (error) {
        console.error('Error fetching daily collection data:', error);
        res.status(500).json({ error: 'An error occurred while fetching data' });
    }

}

export const downloadDailyRegistration = async (req, res) => {
    const { startDate, endDate } = req.params;
    try {
       
        // Set the time range for the selected date (from midnight to midnight)
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Use the createdAt field in the Bill model to query data
        const dailyCollectionData = await PatientReg.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        })
       
        // Define custom column names
        const columns = [
            'Date',
            'Patient Name',
            'Gender',
            'Age',
            'Contact No.',
            'Email',
        ];

        // Map the data to an array of arrays
        const data = dailyCollectionData.map(item => [
            formatDate(item.createdAt),
            `${item.pSalutation}. ${item.pName}`,
            item.pGender,
            item.pAge,
            item.pNum,
            item.pEmail,
        ]);

        // Create a new Excel workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([columns, ...data]);

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Registration Report');

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set the response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="daily-collection.xlsx"');

        // Send the buffer as the response
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Error fetching daily collection data:', error);
        res.status(500).json({ error: 'An error occurred while fetching data' });
    }
}

export const doctorWiseCollection = async (req, res) => {
    const { doctorId, startDate, endDate } = req.params;

    try {
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        const doctorWiseCollection = await Bill.find({
            doctorName: doctorId,
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        })
            .populate('refId', 'pName pNum pAge pGender pSalutation')
            .populate('doctorName', 'drName'); // Reference to the Doctor model, selecting only doctorName field

        // Format the createdAt field as "day month year"
        const formattedData = doctorWiseCollection.map(item => {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = new Intl.DateTimeFormat('en-US', options).format(item.createdAt);
            return {
                ...item.toObject(),
                createdAt: formattedDate,
            };
        });

        res.json(formattedData);
    } catch (error) {
        console.error('Error fetching doctor-wise collection:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const downloadDoctorWise = async (req, res) => {

    const { doctorId, startDate, endDate } = req.params;

    try {
       
        // Set the time range for the selected date (from midnight to midnight)
        const startDates = new Date(startDate);
        startDates.setHours(0, 0, 0, 0);

        const endDates = new Date(endDate);
        endDates.setHours(23, 59, 59, 999);

        // Use the createdAt field in the Bill model to query data
        const doctorWiseCollectionData = await Bill.find({
            doctorName: doctorId,
            createdAt: { $gte: startDates, $lte: endDates },
        })
            .populate('refId', 'pName pNum pAge pGender pSalutation')
            .populate('doctorName', 'drName');

        // Define custom column names for doctor-wise report
        const columns = [
            'Date',
            'Bill ID',
            'Patient Name',
            'Bill Amount',
            'Discount',
            'Revenue',
        ];

        // Map the data to an array of arrays
        const data = doctorWiseCollectionData.map((item) => [
            formatDate(item.createdAt),
            item.billId,
            `${item.refId.pSalutation}. ${item.refId.pName}`,
            item.billAmount,
            item.discountAmount,
            item.amountPaid,
        ]);

        // Create a new Excel workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([columns, ...data]);

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Doctor Wise Collection');

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set the response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="doctor-wise-collection-${formatDate(startDates)}.xlsx"`);

        // Send the buffer as the response
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Error fetching doctor-wise collection data:', error);
        res.status(500).json({ error: 'An error occurred while fetching data' });
    }

}


// export const testperformance = async (req, res) => {
//     const { fromDate, toDate } = req.query;
  
//     if (!fromDate || !toDate) {
//       return res.status(400).json({ error: 'fromDate and toDate are required' });
//     }
  
//     try {
//       const from = new Date(fromDate);
//       const to = new Date(toDate);
  
//       // Ensure 'to' includes the entire day
//       to.setHours(23, 59, 59, 999);
  
//       // Fetch labResultDetails within the specified date range
//       const results = await labResultDetail.find({
//         createdAt: {
//           $gte: from,
//           $lte: to
//         }
//       }).exec();
  
//       // Extract unique test IDs from the results
//       const testIds = [...new Set(results.map(result => result.id))];
  
//       // Fetch the test names for the unique test IDs
//       const tests = await Test.find({ _id: { $in: testIds } }).exec();
  
//       // Create a map of testId to test name for quick lookup
//       const testMap = tests.reduce((map, test) => {
//         map[test._id] = test.name;
//         return map;
//       }, {});
  
//       // Prepare the response data
//       const responseData = results.map(result => ({
//         name: testMap[result.id] || 'Unknown Test',
//         ...result._doc
//       }));
  
//       res.json(responseData);
//     } catch (error) {
//       console.error('Error fetching lab result details:', error);
//       res.status(500).json({ error: 'An error occurred while fetching lab result details' });
//     }
//   };

export const testperformance = async (req, res) => {
    const { fromDate, toDate } = req.query;
  
    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'fromDate and toDate are required' });
    }
  
    try {
      const from = new Date(fromDate);
      const to = new Date(toDate);
  
      // Ensure 'to' includes the entire day
      to.setHours(23, 59, 59, 999);
  
      // Fetch BillDetail within the specified date range
      const billDetails = await BillDetail.find({
        createdAt: {
          $gte: from,
          $lte: to
        }
      }).exec();
  
      // Extract unique test IDs and types from the results
      const testRequests = billDetails.map(detail => {
        return { id: detail.testId, type: detail.type };
      });
  
      // Fetch the relevant data based on the type
      const [tests, groups, profiles] = await Promise.all([
        Test.find({ _id: { $in: testRequests.filter(req => req.type === 'Test').map(req => req.id) } }).exec(),
        GroupTest.find({ _id: { $in: testRequests.filter(req => req.type === 'Group').map(req => req.id) } }).exec(),
        CreateProfile.find({ _id: { $in: testRequests.filter(req => req.type === 'Profile').map(req => req.id) } }).exec()
      ]);
  
      // Create maps for quick lookup based on type
      const testMap = tests.reduce((map, test) => {
        map[test._id] = test.name;
        return map;
      }, {});
  
      const groupMap = groups.reduce((map, group) => {
        map[group._id] = group.groupName;
        return map;
      }, {});
  
      const profileMap = profiles.reduce((map, profile) => {
        map[profile._id] = profile.profileName;
        return map;
      }, {});
  
      // Prepare the response data
      const responseData = billDetails.map(detail => {
        let name;
        switch (detail.type) {
          case 'Test':
            name = testMap[detail.testId] || 'Unknown Test';
            break;
          case 'Group':
            name = groupMap[detail.testId] || 'Unknown Group';
            break;
          case 'Profile':
            name = profileMap[detail.testId] || 'Unknown Profile';
            break;
          default:
            name = 'Unknown';
        }
  
        return {
          name,
          type: detail.type,
          ...detail._doc
        };
      });
  
      res.json(responseData);
    } catch (error) {
      console.error('Error fetching bill details:', error);
      res.status(500).json({ error: 'An error occurred while fetching bill details' });
    }
  };
  



export const patientPerformance = async (req, res) => {
    try {
      const { fromDate, toDate } = req.query;
  
      // Convert date strings to Date objects
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);
  
      // Ensure dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
  
      // Adjust endDate to include the entire day
      endDate.setHours(23, 59, 59, 999);
  
      // Log dates for debugging
      console.log('Fetching data from:', startDate);
      console.log('Fetching data to:', endDate);
  
      // Fetch BillDetail documents within the specified date range
      const billDetails = await BillDetail.find({
        createdAt: { $gte: startDate, $lte: endDate }
      })
      .populate({
        path: 'refBillId',
        populate: {
          path: 'refId',
          populate: {
            path: 'doctorName',
            model: 'doctorDetail'
          },
          model: 'PatientReg',
          select: 'pName pNum pAge pGender pSalutation'
        },
        model: 'Bill'
      });
  
      // Check if data is fetched
      if (billDetails.length === 0) {
        return res.status(404).json({ error: 'No data found for the given date range' });
      }
  
      // Aggregate data by billId to get the number of tests
      const billMap = new Map();
  
      // First gather all details for aggregation
      await Promise.all(billDetails.map(async (detail) => {
        const billId = detail.refBillId._id;
        if (!billMap.has(billId)) {
          billMap.set(billId, {
            billDetail: detail.refBillId,
            patientName: detail.refBillId.refId.pName,
            doctorName: detail.refBillId.refId.doctorName ? detail.refBillId.refId.doctorName.drName : 'N/A',
            tests: []
          });
        }
  
        const billData = billMap.get(billId);
        let test = await Test.findById(detail.testId);
        let group = test ? null : await GroupTest.findById(detail.testId);
        let profile = group ? null : await CreateProfile.findById(detail.testId);
  
        billData.tests.push({
          testName: test ? test.name : group ? group.groupName : profile ? profile.profileName : 'Unknown'
        });
      }));
  
      // Transform the aggregated data to include the number of tests
      const results = Array.from(billMap.values()).map(bill => ({
        ...bill,
        numberOfTests: bill.tests.length,
      }));
  
      res.json(results);
    } catch (error) {
      console.error('Error fetching patient performance data:', error);
      res.status(500).json({ error: 'Error fetching patient performance data' });
    }
  };
  
  
  // Function to get most visiting patients
export const getMostVisitingPatients = async (req, res) => {
    const { fromDate, toDate } = req.query;
  
    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'fromDate and toDate are required' });
    }
  
    try {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999); // Include the entire day
  
      // Fetch bills within the specified date range
      const bills = await Bill.find({
        createdAt: { $gte: from, $lte: to },
      }).populate('refId', 'pName pNum'); // Populate patient details
  
      // Count visits per patient
      const visitCounts = bills.reduce((acc, bill) => {
        const patientId = bill.refId._id.toString();
        if (!acc[patientId]) {
          acc[patientId] = { patient: bill.refId, visitCount: 0 };
        }
        acc[patientId].visitCount += 1;
        return acc;
      }, {});
  
      // Convert to array and sort by visit count
      const sortedPatients = Object.values(visitCounts).sort((a, b) => b.visitCount - a.visitCount);
  
      // Limit to top 10 patients (adjust as needed)
      const topPatients = sortedPatients.slice(0, 10);
  
      res.json(topPatients);
    } catch (error) {
      console.error('Error fetching most visiting patients:', error);
      res.status(500).json({ error: 'An error occurred while fetching most visiting patients' });
    }
  };
  
//   export const mostTestConducted = async (req, res) => {
//     const { fromDate, toDate } = req.query;
  
//     if (!fromDate || !toDate) {
//       return res.status(400).json({ error: 'fromDate and toDate are required' });
//     }
  
//     try {
//       const from = new Date(fromDate);
//       const to = new Date(toDate);
  
//       // Ensure 'to' includes the entire day
//       to.setHours(23, 59, 59, 999);
  
//       // Fetch BillDetail within the specified date range
//       const billDetails = await BillDetail.find({
//         createdAt: {
//           $gte: from,
//           $lte: to
//         }
//       }).exec();
  
//       // Extract unique test IDs and types from the results
//       const testRequests = billDetails.map(detail => ({
//         id: detail.testId,
//         type: detail.type
//       }));
  
//       // Fetch the relevant data based on the type
//       const [tests, groups, profiles] = await Promise.all([
//         Test.find({ _id: { $in: testRequests.filter(req => req.type === 'Test').map(req => req.id) } }).exec(),
//         GroupTest.find({ _id: { $in: testRequests.filter(req => req.type === 'Group').map(req => req.id) } }).exec(),
//         CreateProfile.find({ _id: { $in: testRequests.filter(req => req.type === 'Profile').map(req => req.id) } }).exec()
//       ]);
  
//       // Create maps for quick lookup based on type
//       const testMap = tests.reduce((map, test) => {
//         map[test._id] = { name: test.name, rating: test.rating }; // Include rating
//         return map;
//       }, {});
  
//       const groupMap = groups.reduce((map, group) => {
//         map[group._id] = { name: group.groupName, rating: group.rating }; // Include rating
//         return map;
//       }, {});
  
//       const profileMap = profiles.reduce((map, profile) => {
//         map[profile._id] = { name: profile.profileName, rating: profile.rating }; // Include rating
//         return map;
//       }, {});
  
//       // Aggregate counts for each test
//       const testCounts = billDetails.reduce((counts, detail) => {
//         const key = `${detail.testId}-${detail.type}`;
//         counts[key] = (counts[key] || 0) + 1;
//         return counts;
//       }, {});
  
//       // Prepare the response data
//       const responseData = Object.entries(testCounts).map(([key, count]) => {
//         const [testId, type] = key.split('-');
//         let name = 'Unknown';
//         let rating = 0;
  
//         switch (type) {
//           case 'Test':
//             ({ name, rating } = testMap[testId] || {});
//             break;
//           case 'Group':
//             ({ name, rating } = groupMap[testId] || {});
//             break;
//           case 'Profile':
//             ({ name, rating } = profileMap[testId] || {});
//             break;
//         }
  
//         return {
//           name,
//           type,
//           rating,
//           conductCount: count
//         };
//       });
  
//       res.json(responseData);
//     } catch (error) {
//       console.error('Error fetching bill details:', error);
//       res.status(500).json({ error: 'An error occurred while fetching bill details' });
//     }
//   };

export const mostTestConducted = async (req, res) => {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
        return res.status(400).json({ error: 'fromDate and toDate are required' });
    }

    try {
        const from = new Date(fromDate);
        const to = new Date(toDate);

        // Ensure 'to' includes the entire day
        to.setHours(23, 59, 59, 999);

        // Fetch BillDetail within the specified date range
        const billDetails = await BillDetail.find({
            createdAt: {
                $gte: from,
                $lte: to
            }
        }).exec();

        // Aggregate counts for each test
        const testCounts = billDetails.reduce((counts, detail) => {
            const key = `${detail.testId}-${detail.type}`;
            counts[key] = (counts[key] || 0) + 1;
            return counts;
        }, {});

        // Extract unique test IDs and types from the results
        const testRequests = Object.keys(testCounts).map(key => {
            const [id, type] = key.split('-');
            return { id, type, count: testCounts[key] };
        });

        // Fetch the relevant data based on the type
        const [tests, groups, profiles] = await Promise.all([
            Test.find({ _id: { $in: testRequests.filter(req => req.type === 'Test').map(req => req.id) } }).exec(),
            GroupTest.find({ _id: { $in: testRequests.filter(req => req.type === 'Group').map(req => req.id) } }).exec(),
            CreateProfile.find({ _id: { $in: testRequests.filter(req => req.type === 'Profile').map(req => req.id) } }).exec()
        ]);

        // Create maps for quick lookup based on type
        const testMap = tests.reduce((map, test) => {
            map[test._id] = test.name;
            return map;
        }, {});

        const groupMap = groups.reduce((map, group) => {
            map[group._id] = group.groupName;
            return map;
        }, {});

        const profileMap = profiles.reduce((map, profile) => {
            map[profile._id] = profile.profileName;
            return map;
        }, {});

        // Prepare the response data
        const responseData = testRequests.map(request => {
            const { id, type, count } = request;
            let name;

            switch (type) {
                case 'Test':
                    name = testMap[id] || 'Unknown Test';
                    break;
                case 'Group':
                    name = groupMap[id] || 'Unknown Group';
                    break;
                case 'Profile':
                    name = profileMap[id] || 'Unknown Profile';
                    break;
                default:
                    name = 'Unknown';
            }

            return {
                name,
                type,
                conductCount: count
            };
        });

        // Sort by conductCount in descending order and limit to top 10
        responseData.sort((a, b) => b.conductCount - a.conductCount);
        const top10 = responseData.slice(0, 10);

        res.json(top10);
    } catch (error) {
        console.error('Error fetching bill details:', error);
        res.status(500).json({ error: 'An error occurred while fetching bill details' });
    }
};

export const sendWhatsappPromotion = async (req, res) => {
    const { patientIds, message } = req.body;
  
    try {
      // Fetch the PatientReg documents for the given patient IDs
      const patients = await PatientReg.find({ _id: { $in: patientIds } });
  
      if (!patients.length) {
        return res.status(404).json({ error: 'No patients found' });
      }
  
      // Iterate over each patient and send the WhatsApp message
      for (const patient of patients) {
        const phoneNumber = patient.pNum;
  
        if (!phoneNumber) {
          continue; // Skip if no phone number is found
        }
  
        const apiUrl = 'https://api.whatsdesk.in/v4/text.php';
        const apiKey = 'cbEMMQdLJqBjBAikPT';
  
        // Create a FormData object
        const formData = new FormData();
        formData.append('key', apiKey);
        formData.append('number', '91' + phoneNumber); // Assuming you need to prepend '91' to the contact number
        formData.append('message', message);
  
        // Make a POST request using axios with the FormData
        const response = await axios.post(apiUrl, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        });
  
        // Log the response for debugging purposes
        console.log(`WhatsApp message sent to ${phoneNumber} successfully`);
      }
  
      return res.status(200).json({
        status: true,
        message: 'Messages sent successfully',
      });
    } catch (error) {
      console.error('Error sending WhatsApp promotion messages:', error);
      return res.status(500).json({
        status: false,
        message: 'Error sending messages',
      });
    }
  };
  
  
export default dailyCollectionreport
