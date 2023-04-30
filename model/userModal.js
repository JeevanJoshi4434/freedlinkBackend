const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        require: true,
    },
    Interest:[
        {type:String}
    ],
    img: {
        type:String
    },
    email: {
        type: String,
        require: true,
    },
    password: {
        type: String,
        require: true,
    },
    contactNo: {
        type: Number,
    },
    country: {
        type:String,
    },
    createdDate: {
        type: Date,
        default: Date.now(),
    },
    company: [{
        positionCompany: {
            type: String,
        },
        nameCompany: {
            type: String,
        },
        experienceWork: {
            type: Number,
        },
        yearFrom:{
            type:Date
        },
        yearTo:{
            type:Date,
        },
        current:{
            type:Boolean,
        }
    }]
    ,
    education: [{
        universityName: {
            type: String,
            required: true,
        },
        degree: {
            type: String,
            require: true,
        },
        subject:{
            type:String,
        },
        fromTo: {
            dateFrom: {
                type: Date,
                require: true,
            },
            dateTo: {
                type: Date,
                require: true
            }
        }
    }
    ],
    aboutBio: {
        type: String,
        default: ""
    },
    project: [{
        projectTitle: {
            type: String,
            default: ""
        },
        projectDescription: {
            type: String,
            default: ""
        },
        projectWebsite: {
            type: String,
            default: ""
        }
    }],
        skills:[{
                type: String
            }],
    role: {
        type: String,
    },
    followers: {
        type: Array,
        required: true
    },
    following: {
        type: Array,
        required: true
    },verified:{
        type:Boolean,
        default:false
    },
    shortBio:{
        type:String,
    },
    yourCompany:{
        type:String,
        default:""
    },
    officeAddress:{
        type: String,
        default:""
    },
    officeEmail:{
        type:String,
        default:""
    },
    sector:{
        type:String,
        default:""
    },
    GSTNumber:{
        type:String,
        default:""
    },
    isHR:{
        type:Boolean,
        default:false
    },
    notInterested:{
        type:Array,    
    },
    savedPost:{
        type:Array
    },
    blockedUser:{
        type:Array
    },
    createdYear:{
        type:String
    },
    createdMonth:{
        type:String
    },
    credits:{
        type:Number,
        default:0
    },
    createdDay:{
        type:String
    },
    enrolled:[]
},{timestamps:true})

module.exports = mongoose.model("Users", userSchema);