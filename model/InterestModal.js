const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({
    fields:[{
        type:String
    }]
})

module.exports = mongoose.model("interestField", interestSchema);