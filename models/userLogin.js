import mongoose from "mongoose";

const userlikeSchema = new mongoose.Schema({

    username:{type:String},

    password:{type:String},

    userAccess: [{ type: String }] 

})

const User = mongoose.model('User', userlikeSchema)

export default User