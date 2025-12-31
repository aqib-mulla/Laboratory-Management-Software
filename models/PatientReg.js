import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
   
    pId : {
        type: Number,
        // required : true
    },
    pSalutation : {
        type: String,
        // required : true
    },
    pName : {
        type: String,
        // required : true
    },
    pAge : {
        type: String,
        // required : true
    },
    pGender : {
        type: String,
        // required : true
    },
    pNum : {
        type: Number,
        // required : true
    },
    pEmail : {
        type: String,
        // required : true
    },
    doctorName : {
        type: String,
        // required : true
    },

  createdAt: { type: Date, default: Date.now },


    
})

const PatientReg = mongoose.model('PatientReg', patientSchema);

export default PatientReg;
