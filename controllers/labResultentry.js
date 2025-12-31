import Bill from "../models/Bill.js";
import Test from "../models/Tests.js";
import GroupTest from "../models/GroupTest.js";
import BillDetail from "../models/BillDetails.js";
import CreateProfile from "../models/CreateProfile.js";
import labResultDetail from "../models/labResultDetail.js";
import labResult from "../models/labResult.js";


// const testDetails = async (req, res) => {
//     try {
//         const id = req.params.id;

//         const bill = await Bill.findById(id)
//             .populate('refId', 'pName pNum pAge pGender pSalutation pNum')
//             .populate('doctorName', 'drName')
//             .exec();

//         if (!bill) {
//             return res.status(404).json({ message: 'Bill not found' });
//         }

//         function formatDate(dateString) {
//             const date = new Date(dateString);
//             const day = date.getDate();
//             const month = date.getMonth() + 1; // Adding 1 because getMonth() returns 0-based index
//             const year = date.getFullYear();
//             return `${day}/${month}/${year}`;
//         }

//         const data = {
//             data: {
//                 billId: bill.billId,
//                 pName: bill.refId.pName,
//                 pAge: bill.refId.pAge,
//                 pGender: bill.refId.pGender,
//                 pSal: bill.refId.pSalutation,
//                 pNum: bill.refId.pNum,
//                 drName: bill.doctorName.drName,
//                 billAmount: bill.billAmount,
//                 amountDue: bill.amountDue,
//                 amountPaid: bill.amountPaid,
//                 billDate: formatDate(bill.createdAt),
//             },
//             feesData: [],
//         };

//         const feesData = await BillDetail.find({ refBillId: id });

//         for (const fee of feesData) {
//             const feesType = await getFeesType(fee.testId, fee.type);
//             if (feesType) {
//                 let feesTypeName;
//                 let reference_range = '';
//                 let units = '';
//                 let category = '';
//                 let testFields = []; // To hold testFields in the desired order

//                 const profile = await CreateProfile.findById(fee.testId, 'testFields');

//                 if (profile) {
//                     feesTypeName = feesType.profileName;
                
//                     // Extract the testIds and their corresponding model types from the testFields array in the group model
//                     const testIdsFromGroup = profile.testFields.map(field => ({ testId: field.testId, type: field.type }));
                
//                     // Separate the testIds based on their model type
//                     const groupTestIds = testIdsFromGroup.filter(entry => entry.type === 'Group').map(entry => entry.testId);
//                     const individualTestIds = testIdsFromGroup.filter(entry => entry.type === 'Test').map(entry => entry.testId);
                
//                     // Fetch group details from the group model (assuming a method called 'getGroupDetailsById')
//                     const groupDetails = await getGroupDetailsById(groupTestIds);
//                     // Fetch test details based on the individual testIds from the Test model
//                     const testDetails = await Test.find({ _id: { $in: individualTestIds } }, 'reference_range units name category type');
                
//                     if (testDetails && groupDetails) {
//                         // Populate testFields with the details from the Test model and Group model
//                         const testFields = profile.testFields.map(field => {
//                             let testDetail;
//                             if (field.type === 'Test') {
//                                 // Find the corresponding testDetail in the Test model
//                                 testDetail = testDetails.find(detail => detail._id.equals(field.testId));
//                             } else if (field.type === 'Group') {
//                                 const groupDetail = groupDetails.find(detail => detail._id.equals(field.testId));
//                                 if (groupDetail) {
//                                     // Include group test fields directly in the testFields array
//                                     return groupDetail.testFields.map(testField => ({
//                                         ...testField,
//                                         testid: testField._id,
//                                         type: 'Profile',
//                                     }));
//                                 } else {
//                                     return [];
//                                 }
//                             }
                
//                             return {
//                                 _id: testDetail._id,
//                                 name: testDetail.name,
//                                 reference_range: testDetail.reference_range,
//                                 units: testDetail.units,
//                                 category: testDetail.category,
//                                 feesType: feesTypeName,
//                                 testid: testDetail._id,
//                                 type: testDetail.type,
//                             };
//                         }).flat(); // Flatten the array of arrays
                
//                         data.feesData.push({
//                             id: fee._id,
//                             type: fee.type,
//                             testid: fee.testId,
//                             feesType: feesTypeName,
//                             fees: fee.fees,
//                             discount: fee.discount,
//                             tests: testFields,
//                         });
//                     }
//                 }                
//                  else if (fee.type === 'Group') {
//                     feesTypeName = feesType.groupName;

//                     const group = await GroupTest.findById(fee.testId, 'testFields groupCategory');
//                     if (group) {
//                         const testIds = group.testFields.map(field => field.testId);
//                         const testDetails = await Test.find({ _id: { $in: testIds } }, 'reference_range units name category');
//                         if (testDetails) {
//                             // Populate testFields in the desired order
//                             testFields = group.testFields.map(field => {
//                                 const testDetail = testDetails.find(detail => detail._id.equals(field.testId));
//                                 return {
//                                     _id: testDetail._id,
//                                     name: testDetail.name,
//                                     reference_range: testDetail.reference_range,
//                                     units: testDetail.units,
//                                     category: testDetail.category,
//                                     testid: testDetail._id,
//                                     feesType: feesTypeName,
//                                     type: fee.type,
//                                 };
//                             });

//                             data.feesData.push({
//                                 id: fee._id,
//                                 type: fee.type,
//                                 testid: fee.testId,
//                                 feesType: feesTypeName,
//                                 fees: fee.fees,
//                                 category: group.groupCategory,
//                                 discount: fee.discount,
//                                 tests: testFields,
//                             });
//                         }
//                     }
//                 } else {
//                     feesTypeName = feesType.name;

//                     const test = await Test.findById(fee.testId, 'reference_range units category');
//                     if (test) {
//                         reference_range = test.reference_range;
//                         units = test.units;
//                         category = test.category;
//                     }

//                     data.feesData.push({
//                         id: fee._id,
//                         type: fee.type,
//                         testid: fee.testId,
//                         feesType: feesTypeName,
//                         fees: fee.fees,
//                         reference_range: reference_range,
//                         units: units,
//                         category: category,
//                         discount: fee.discount,
//                     });
//                 }
//             }
//         }

//         res.json(data);
//     } catch (error) {
//         console.error('Error fetching bill details:', error);
//         res.status(500).json({ error: 'Failed to fetch bill details' });
//     }
// };

const testDetails = async (req, res) => {
    try {
        const id = req.params.id;

        // Retrieve bill details and populate necessary fields
        const bill = await Bill.findById(id)
            .populate('refId', 'pName pNum pAge pGender pSalutation pNum')
            .populate('doctorName', 'drName')
            .lean() // Optimize performance by returning plain JavaScript objects
            .exec();

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        function formatDate(dateString) {
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
                pAge: bill.refId.pAge,
                pGender: bill.refId.pGender,
                pSal: bill.refId.pSalutation,
                pNum: bill.refId.pNum,
                drName: bill.doctorName.drName,
                billAmount: bill.billAmount,
                amountDue: bill.amountDue,
                amountPaid: bill.amountPaid,
                billDate: formatDate(bill.createdAt),
            },
            feesData: [],
        };

        // Fetch bill details
        const feesData = await BillDetail.find({ refBillId: id }).lean();

        // Create an array of promises for fetching test details
        const promises = feesData.map(async (fee) => {
            try {
                const feesType = await getFeesType(fee.testId, fee.type);
                if (!feesType) {
                    return null;
                }

                let feesTypeName;
                let testFields = [];
                
                if (fee.type === 'Profile') {
                    const profile = await CreateProfile.findById(fee.testId, 'testFields').lean();
                    if (profile) {
                        feesTypeName = feesType.profileName;
                        const testIds = profile.testFields.map(field => field.testId);
                        const testDetails = await Test.find({ _id: { $in: testIds } }).lean();

                        testFields = profile.testFields.map(field => {
                            const testDetail = testDetails.find(test => test._id.equals(field.testId));
                            return {
                                _id: testDetail._id,
                                name: testDetail.name,
                                reference_range: testDetail.reference_range,
                                units: testDetail.units,
                                category: testDetail.category,
                                result: 0 // Adding empty result field
                            };
                        });

                        return {
                            id: fee._id,
                            type: fee.type,
                            testid: fee.testId,
                            feesType: feesTypeName,
                            fees: fee.fees,
                            discount: fee.discount,
                            tests: testFields,
                        };
                    }
                } else if (fee.type === 'Group') {
                    feesTypeName = feesType.groupName;
                    const group = await GroupTest.findById(fee.testId, 'testFields groupCategory').lean();
                    if (group) {
                        const testIds = group.testFields.map(field => field.testId);
                        const testDetails = await Test.find({ _id: { $in: testIds } }).lean();
                        testFields = group.testFields.map(field => {
                            const testDetail = testDetails.find(test => test._id.equals(field.testId));
                            return {
                                _id: testDetail._id,
                                name: testDetail.name,
                                reference_range: testDetail.reference_range,
                                units: testDetail.units,
                                category: testDetail.category,
                                testid: testDetail._id,
                                type: fee.type,
                                result: 0 // Adding empty result field
                            };
                        });

                        return {
                            id: fee._id,
                            type: fee.type,
                            testid: fee.testId,
                            feesType: feesTypeName,
                            fees: fee.fees,
                            category: group.groupCategory,
                            discount: fee.discount,
                            tests: testFields,
                        };
                    }
                } else {
                    feesTypeName = feesType.name;
                    const test = await Test.findById(fee.testId, 'reference_range units category').lean();
                    return {
                        id: fee._id,
                        type: fee.type,
                        testid: fee.testId,
                        feesType: feesTypeName,
                        fees: fee.fees,
                        reference_range: test ? test.reference_range : '',
                        units: test ? test.units : '',
                        category: test ? test.category : '',
                        discount: fee.discount,
                        result: 0, // Adding empty result field
                    };
                }
            } catch (error) {
                console.error(`Error fetching fee details for feeId ${fee._id}:`, error);
                return null;
            }
        });

        // Execute all promises concurrently
        const results = await Promise.all(promises);

        // Filter out null results
        data.feesData = results.filter(result => result !== null);

        res.json(data);
    } catch (error) {
        console.error('Error fetching bill details:', error);
        res.status(500).json({ error: 'Failed to fetch bill details' });
    }
};

const getGroupDetailsById = async (groupIds) => {
    try {
        // Assuming there is a Group model with a method to fetch details by ID
        const groupDetails = await GroupTest.find({ _id: { $in: groupIds } }, 'testFields');

        // Extract the testIds from testFields in each group detail and flatten the nested arrays
        const flatTestIds = groupDetails.flatMap(group =>
            group.testFields.map(field => field.testId)
        );

        // Fetch test details based on the flattened testIds
        const testDetails = await Test.find(
            { _id: { $in: flatTestIds } },
            'name reference_range units category type'
        );

        // Map test details to their respective group details, considering nested arrays
        const groupedTestDetails = groupDetails.map(group => {
            const groupTestDetails = group.testFields.map(field => {
                const testDetail = testDetails.find(detail =>
                    detail._id.equals(field.testId)
                );
                return {
                    _id: testDetail._id,
                    name: testDetail.name,
                    reference_range: testDetail.reference_range,
                    units: testDetail.units,
                    category: testDetail.category,
                    type: testDetail.type,
                };
            });

            return {
                _id: group._id,
                testFields: groupTestDetails,
            };
        });

        return groupedTestDetails;
    } catch (error) {
        console.error('Error fetching group details:', error);
        throw error; // Handle the error appropriately in your application
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

// export const saveResult = async (req, res) => {
//     try {
//         const objbillId = req.params.id;
//         const { results } = req.body;

//         // Use bulkWrite to perform update operations for existing records and upsert for new records
//         const bulkOperations = results.map(({ id, resultId, result, type, fieldId }) => ({
//             updateOne: {
//                 filter: { objbillId, resultId },
//                 update: { objbillId, id, resultId, type, fieldId, result },
//                 upsert: true, // Set to true for new records, false for updates
//             },
//         }));

//         await labResultDetail.bulkWrite(bulkOperations);

//         res.status(201).json({ message: 'Results saved successfully' });
//     } catch (error) {
//         console.error('Error saving results:', error);
//         res.status(500).json({ error: 'An error occurred while saving results' });
//     }
// };


export const saveResult = async (req, res) => {
    try {
        const objbillId = req.params.id;
        const { results } = req.body;

        // Use bulkWrite to perform update operations for existing records and upsert for new records
        const bulkOperations = results.map(({ id, resultId, result, abnormalValue, type, fieldId }) => ({
            updateOne: {
                filter: { objbillId, resultId },
                update: { objbillId, id, resultId, type, fieldId, result, abnormalValue },
                upsert: true, // Set to true for new records, false for updates
            },
        }));

        await labResultDetail.bulkWrite(bulkOperations);

        res.status(201).json({ message: 'Results saved successfully' });
    } catch (error) {
        console.error('Error saving results:', error);
        res.status(500).json({ error: 'An error occurred while saving results' });
    }
};

export const getEnteredResult = async (req, res) => {
    try {
        const objbillId = req.params.id;

        // Fetch LabResult data
        const labResults = await labResult.findOne({ objbillId });

        // Fetch LabResultDetail data
        const labResultDetails = await labResultDetail.find({ objbillId });

        // Combine the fetched data into a response object
        const data = {
            billDetails: labResults,
            results: labResultDetails,
        };

        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'An error occurred while fetching data' });
    }

}
export default testDetails