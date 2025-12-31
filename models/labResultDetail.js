import mongoose from "mongoose";

const labresultSchema = new mongoose.Schema({

    id:{type: mongoose.Schema.Types.ObjectId},

    fieldId:{type: mongoose.Schema.Types.ObjectId},

    resultId:{type: String},

    objbillId:{type:mongoose.Schema.Types.ObjectId},

    type:{type: String},

    result:{type: String},

    abnormalValue:{type: String},

    createdAt: { type: Date, default: Date.now },


})

const labResultDetail = mongoose.model('labResultDetail', labresultSchema)

export default labResultDetail;