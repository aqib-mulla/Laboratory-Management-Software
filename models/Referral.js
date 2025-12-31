import mongoose from "mongoose";

const ReferralSchema = new mongoose.Schema({
    test_id: {type : mongoose.Schema.Types.ObjectId},
    test_type: {type :String},
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'doctorDetail' },
    amount: { type: Number, default: 0 },
    type: { type: String, default: 'Percentage' },
  });

const Referral = mongoose.model('Referral', ReferralSchema)

export default Referral;