var jwt = require("jsonwebtoken");
const User = require('../model/userModal');
require('dotenv').config({path:"./env/config.env"});
const verifyToken = (req, res, next) => {
  // Get the user from the Jwt token and add id to req object
  const authHeader = req.header("accessToken");
  if (!authHeader) {
    res.status(401).send({ error: "Please authenticate using a valid token" });
  }
  const data = jwt.verify(authHeader, process.env.JWT_SECRET,(err, user) => {
    if (err) return res.status(400).json( `Some Error Occured ${err}`);
    req.user= user;
    });
  next();
};

module.exports = verifyToken;
