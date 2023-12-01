const mongoose = require('mongoose');

const Notification = new mongoose.Schema({
    senderName:{
        type:mongoose.Schema.Types.ObjectId,
    },
    receiverName:{
        type:mongoose.Schema.Types.ObjectId,
    },
    sender:{
        type:String,
    },
    postID:{
        type:mongoose.Schema.Types.ObjectId,
    },
    notifytype:{
       type:Number, 
    },
    createdOn:{
        type:Date,
        default:Date.now()
    },
    senderProfile:{
        type:String
    },
    postImg:{
        type:String
    }
},{timestamps:true});

module.exports = mongoose.model("notifications", Notification);