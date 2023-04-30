const mongoose = require('mongoose');

const ReportModal = new mongoose.Schema({
    type:{
        type:String,
        require:true
    },
    title:{
        type:String,
        require:true
    },
    reportedBy:{
        type:String,
    },
    reportedTo:{
        type:String,
    },
    desc:{
        type:String
    },
    img:{
        type:String,
        default:''
    }
},{timestamps:true})

module.exports = mongoose.model("reports",ReportModal);

