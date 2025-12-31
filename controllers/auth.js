import PatientReg from "../models/PatientReg.js";
import Bill from "../models/Bill.js";
import BillDetail from "../models/BillDetails.js";
import shortid from 'shortid';

// REGISTER PATIENT

// export const register = async (req, res) =>{
//    try{
//     const { userRegistration, selectedTests } = req.body;
//     const {pId,pSalutation,pName, pAge, pGender,pNum, pEmail,doctorName} = userRegistration;
//     const user = new PatientReg({pId, pSalutation,pName, pAge, pGender,pNum, pEmail, doctorName});
//     const userSaved = user.save();
//     res.status(201).json(userSaved);

//    }catch(err){
//     res.status(500).json({error : err.message});
//    } 
// }

export const register = async (req, res) => {
    try {
        const { userRegistration, selectedTests } = req.body;

        // Destructure userRegistration object
        const { pId, pSalutation, pName, pAge, pGender, pNum, pEmail, doctorName } = userRegistration;

        // Create and save PatientReg instance
        const user = new PatientReg({ pId, pSalutation, pName, pAge, pGender, pNum, pEmail, doctorName });
        const userSaved = await user.save();

        // Find the highest billId in the collection
        const highestBill = await Bill.findOne().sort({ billId: -1 }).exec();
        const nextBillId = highestBill ? highestBill.billId + 1 : '1';


        // Create a new Bill instance and save it to the database
        const bill = new Bill({
            pId,
            refId: userSaved._id,
            doctorName,
            billId: nextBillId,
            billAmount: selectedTests[0].billAmount, // Use the total bill amount from the frontend
            amountDue: selectedTests[0].amountDue, // Use the total amount due from the frontend
            amountPaid: selectedTests[0].amountPaid, // Use the total amount paid from the frontend
            paymentMethod: selectedTests[0].paymentMethod, // Use the payment method from the frontend
            discountAmount: selectedTests[0].discountAmount
        });
        // await bill.save();
        const billSaved = await bill.save();

        // Iterate through the selectedTests array and store the data for each test in BillDetail
        const billDetailPromises = selectedTests.map(async test => {
            const { _id, type, fees, profilePrice, groupPrice /* ... */ } = test;

            const billDetail = new BillDetail({
                billId: nextBillId,
                refBillId: billSaved._id,
                testId: _id,
                type,
                fees: fees || profilePrice || groupPrice,
                // ... other properties
            });
            return await billDetail.save();
        });

        // Wait for all billDetail promises to resolve
        await Promise.all(billDetailPromises);

        // Respond with saved data
        res.status(201).json({ user: userSaved, billId: billSaved._id  });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export const createBill = async (req, res) => {
    try {
        const { userRegistration, selectedTests } = req.body;

        // Destructure userRegistration object
        const { pId, pSalutation, pName, pAge, pGender, pNum, pEmail, doctorName } = userRegistration;

        // Check if a patient with the same pId already exists
        const existingPatient = await PatientReg.findOne({ _id : pId });

        let userSaved;

        if (existingPatient) {
            // If patient exists, use the existing patient record
            userSaved = existingPatient;
        } else {
            // If patient doesn't exist, create and save a new PatientReg instance
            const newUser = new PatientReg({ pId, pSalutation, pName, pAge, pGender, pNum, pEmail, doctorName });
            userSaved = await newUser.save();
        }

        // Find the highest billId in the collection
        const highestBill = await Bill.findOne().sort({ billId: -1 }).exec();
        const nextBillId = highestBill ? highestBill.billId + 1 : '1';

        // Create a new Bill instance and save it to the database
        const bill = new Bill({
            refId: userSaved._id,
            doctorName,
            billId: nextBillId,
            billAmount: selectedTests[0].billAmount,
            amountDue: selectedTests[0].amountDue,
            amountPaid: selectedTests[0].amountPaid,
            paymentMethod: selectedTests[0].paymentMethod,
            discountAmount: selectedTests[0].discountAmount
        });

        const billSaved = await bill.save();

        // Iterate through the selectedTests array and store the data for each test in BillDetail
        const billDetailPromises = selectedTests.map(async test => {
            const { _id, type, fees, profilePrice, groupPrice, opFees, department /* ... */ } = test;

            const billDetail = new BillDetail({
                billId: nextBillId,
                refBillId: billSaved._id,
                testId: _id,
                department,
                type,
                fees: fees || profilePrice || groupPrice || opFees,
                // ... other properties
            });
            return await billDetail.save();
        });

        // Wait for all billDetail promises to resolve
        await Promise.all(billDetailPromises);

        // Respond with saved data
        res.status(201).json({ user: userSaved, billId: billSaved._id  });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}





export const createPatient = async (req, res) => {
    try {
        const { patientDetails } = req.body;
        const { pId, pSalutation, pName, pAge, pGender, pNum, pEmail, doctorName } = patientDetails;
        const user = new PatientReg({ pId, pSalutation, pName, pAge, pGender, pNum, pEmail, doctorName });
        const userSaved = user.save();
        res.status(201).json(userSaved);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export const getpatients = async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    try {
        const patients = await PatientReg.find();
        // console.log('Fetched tests:', patients);
        res.json(patients);
    } catch (error) {
        console.error('Error fetching tests:', error);
        res.status(500).json({ error: 'Failed to fetch tests' });
    }
}

export const nextpId = async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    try {
        // Find the highest patient ID in the database
        const highestPatient = await PatientReg.findOne().sort({ pId: -1 });

        // Calculate the next patient ID
        const nextPatientId = highestPatient ? highestPatient.pId + 1 : 1;

        res.json({ nextPatientId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


export const getPatientById = async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    try {
        const pId = req.params.id; // Get the patient id from the route parameter
        const patient = await PatientReg.findById(pId); // Use findById to fetch a patient by id
        // console.log('Fetched patient:', patient);

        if (!patient) {
            return res.status(404).json({ error: 'patient not found' });
        }

        res.json(patient);
    } catch (error) {
        console.error('Error fetching patient:', error);
        res.status(500).json({ error: 'Failed to fetch patient' });
    }
}

export const updatePatient = async (req, res) => {
    const pId = req.params.id;
    const updatedData = req.body;
    // console.log(updatedData);

    try {
        const updatedPatient = await PatientReg.findByIdAndUpdate(
            pId,
            updatedData,
            { new: true }
        );

        res.json(updatedPatient);
    } catch (error) {
        res.status(500).json({ error: 'Error updating doctor' });
    }
};


export const deletePatient = async (req, res) => {
    const { pId } = req.params;

    try {
        const deletedPatient = await PatientReg.findByIdAndDelete(pId);

        if (!deletedPatient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        res.json({ message: 'patient deleted successfully' });
    } catch (error) {
        console.error('Error deleting patient:', error);
        res.status(500).json({ error: 'An error occurred while deleting the patient' });
    }
};

export default register