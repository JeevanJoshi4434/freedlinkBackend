const mongoose = require('mongoose');
const MessageModalSchema = new mongoose.Schema({
    ChatUsers:{
        type:Array,
        require:true
    },
    message:{
        type:String,
        require:true
    },
    time:{
        type:String,
        default:Date.now()
    },
    Sender:{
        type:mongoose.Schema.Types.ObjectId,
        require:true
    }
},{timestamps:true})

module.exports = mongoose.model("MessageModal", MessageModalSchema);