const mongoose = require('mongoose');
const postSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        req:true,
    },
    title:{
        type:String,
        req:true,
    },
    image:{
        type:String,
        default:""
    },
    like:{
        type:Array,
    },
    dislike:{
        type:Array,
    },
    createdAt:{
        type:Date,
        default:Date.now(),
    },
    uploadedAt:{
        type:String,
        default: Date.now(),
    },
    comments:[{
        user:{
            type:mongoose.Schema.ObjectId,
            required:true,
        },
        username:{
            type:String,
            required:true
        },
        comment:{
            type:String,
            required:true,
        }
    }]
},{timestamps:true})

module.exports = mongoose.model("Posts", postSchema);