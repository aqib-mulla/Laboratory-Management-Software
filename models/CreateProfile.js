import mongoose from "mongoose";

const profileTestSchema = new mongoose.Schema({
  
    profileName: {
        type: String,
    },

    profilePrice: {
        type: Number,
    },
    
    testFields: [
        {
            testId: { type: mongoose.Schema.Types.ObjectId },
            testName: { type: String},
            type: { type: String}
        },
    ],
});

const CreateProfile = mongoose.model("CreateProfile", profileTestSchema);

export default CreateProfile
