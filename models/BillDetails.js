import mongoose from "mongoose";

const billDetailsSchema = new mongoose.Schema({

  refBillId : {type: mongoose.Schema.Types.ObjectId},

  billId: {
    type: Number,
    // ref: 'Bill', // Reference to the Bill model
    // required: true,
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    // ref: 'Test', // Reference to the Test model
    // required: true,
  },
  type: {
    type: String,
    // ref: 'Test', 
    // required: true,
  },
  fees: {
    type: Number,
    // required: true,
  },
  // Add any other fields specific to the bill details
});

const BillDetail = mongoose.model('BillDetail', billDetailsSchema);

export default BillDetail
