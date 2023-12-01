exports.generateOTP = ()=>{
    let OTP = '';
    for (let i = 0; i <=3; i++) {
        let ramVar = Math.round(Math.random()*9);
        OTP = OTP+ramVar;
    }
    return OTP;
}