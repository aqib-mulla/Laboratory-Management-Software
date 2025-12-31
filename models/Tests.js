import mongoose from "mongoose";

const testSchema = new mongoose.Schema({
    id : {
        type: Number,
        // required : true
    },

    category : {
        type: String,
        // required : true
    },

    name: {
        type: String,
        // required : true
    },

    method : {
        type: String,
        // required : true
    },

    sample: {
        type: String,
        // required : true
    },

    units: {
        type: String,
        // required : true
    },

    comments: {
        type: String,
        // required : true
    },

    reference_range: {
        type: String,
        // required : true
    },

    fees: {
        type: String,
        // required : true
    }


})


const Test = mongoose.model('Test', testSchema);

export default Test;