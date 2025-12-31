import mongoose from "mongoose";

const doctorScheme = new mongoose.Schema({

    docId: {
        type: Number
    },

    drName: {
        type: String
    },

    drGender: {
        type: String
    },

    drEmail: {
        type: String
    },

    drNum: {
        type: Number
    },

    drAddress: {
        type: String
    },


})

const doctorDetail =  mongoose.model('doctorDetail', doctorScheme);

export default doctorDetail;