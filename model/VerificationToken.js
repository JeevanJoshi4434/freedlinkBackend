const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const VerificationTokenSchema = new mongoose.Schema({
    seller:{
        type:mongoose.Schema.Types.ObjectId,
        req:true
    },
    token:{
        type:String,
        req:true
    },
    createdAt:{
        type:Date,
        req:true,
        default:Date.now()
    }
})

VerificationTokenSchema.pre("save", async function(next){
    const salt = await bcrypt.genSalt(10);
    if(this.isModified('token')){
        const hash = await bcrypt.hash(this.token, salt);
        this.token = hash
    }
    next();
})

module.exports = mongoose.model("VerificationToken",VerificationTokenSchema);
