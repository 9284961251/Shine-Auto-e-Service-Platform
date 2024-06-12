const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    vehicleType:{
        type: [String],
        required : true
    } ,
    
    customerName:{
        type : String,
        required : true
    } ,
    phoneNumber: {
        type : Number,
        maxLength : 10,
        required : true
    },
    vehicleDetails:{
        type : String,
        required : true
    } ,
    numberPlate:{
        type : String,
        required : true
    } ,
    serviceType: {
        type : [String],
        required : true
    },
    subService: {
        type : [String],
        required : true
    },
    amountToBePaid :{
        type : Number,
        required : true
    },
    paymentStatus :{
        type : [String],
        required : true
    },
    paymentType : {
        type : [String],
        required : true
    },
    submitDateTime: {
        type: Date, 
        default: Date.now 
    }
});

const Form = mongoose.model('Form', vehicleSchema);
module.exports  = Form;