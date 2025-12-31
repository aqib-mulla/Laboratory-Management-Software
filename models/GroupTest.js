import mongoose from "mongoose";

const groupTestSchema = new mongoose.Schema({
    groupCategory: {
        type: String,
        // required: true,
    },
    groupName: {
        type: String,
        // required: true,
    },
    groupPrice: {
        type: Number,
        // required: true,
    },
    testFields: [
        {
            testId: { type: mongoose.Schema.Types.ObjectId  },
            testName: { type: String},
            subCat: { type: String},
        },
    ],
});

const GroupTest = mongoose.model("GroupTest", groupTestSchema);

export default GroupTest
