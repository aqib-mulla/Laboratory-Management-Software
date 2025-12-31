import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({

    objbillId:{type:mongoose.Schema.Types.ObjectId},

    createdAt: { type: Date, default: Date.now },


})

const labResult = mongoose.model('labResult', resultSchema)

export default labResult;