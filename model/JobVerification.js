const mongoose = require('mongoose');
const verificationSchema = new mongoose.Schema({
    name:{
        type:String,
        require:true
    },
    stopJobUpload:{
        type:Boolean,
        default:false
    }
})

module.exports = mongoose.model("Verification", verificationSchema)