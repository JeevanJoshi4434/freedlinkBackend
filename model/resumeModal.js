const mongoose = require('mongoose')

const resumeModal = new mongoose.Schema({
    Name:{
        type:String,
        require:true
    },
    contactNo:{
        type:Number,
        require:true,
    },
    country:{
        type:String,
        require:true,
    },
    field:[{
        fieldName:{
            type:String,
        },
        fieldDescription:{
            type:String,
        }
    }]
})

module.exports = mongoose.model("Resume", resumeModal)