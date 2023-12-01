// const User = require('../model/userModal');
// const verifyToken = require('./fetchUser');


// exports.authorizeRoles = (...role) =>{
//     return (req,res,next)=>{
//         let user = verifyToken();
//         console.log(user)
//         if(!role.includes(req.user.role)){
//             return res.status(403).json(`Role: ${req.data.role} is not allow to access this resource`)
//         };
  
//         next();
//     };
  
//   }