import mongoose from 'mongoose';
import doctorDetail from './CreateDoctor.js';
import PatientReg from './PatientReg.js';

const billSchema = new mongoose.Schema({
  billId: {type: Number},
  pId: { type: Number} ,
  refId : {type: mongoose.Schema.Types.ObjectId, ref:'PatientReg'},
  billAmount: { type: Number },
  doctorName: { type: mongoose.Schema.Types.ObjectId, ref: 'doctorDetail' },
  refBillId : {type: mongoose.Schema.Types.ObjectId, ref:'BillDetail'},
  discountAmount : {type:Number},
  amountDue: {type: Number},
  amountPaid: { type: Number},
  paymentMethod: {type: String},
  createdAt: { type: Date, default: Date.now },
});

const Bill = mongoose.model('Bill', billSchema);

export default Bill;
