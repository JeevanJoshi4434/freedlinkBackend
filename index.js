const express = require('express');
const app = express();
const mongoose = require('mongoose');
const userRoute = require('./routes/userRoute');
const postRoute = require("./routes/postRoute");
const jobRoute = require("./routes/jobRoute");
const pagination = require('./apis/pagination');
const socket = require("socket.io");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({path:"backend/env/config.env"});

mongoose.connect(process.env.DB_URI).then(()=>
    {console.log(`DB connection successful at URI: ${process.env.DB_URI}`)}).catch((err)=>{
    console.log(`Error Occured: ${err}`)})
    // middleware

app.use(cors());
    app.use(express.json());
    app.use(cookieParser());
// routes
app.use("/api", userRoute);
app.use("/api", postRoute);
app.use("/api/advance", jobRoute);
app.use("/api",pagination);
// interest & history
// app.get('/api/interest', (req, res) => {
//     const searchHistory = req.cookies.pokemon ? JSON.parse(req.cookies.pokemon) : [];
//     res.json({ searchHistory });
//   });
const server = app.listen(process.env.PORT, ()=>{
    console.log(`Server is running at https://${process.env.PORT}`)
});
// if(process.env.SERVER==="PRODUCTION"){
//     app.use(express.static(path.join(__dirname,"../build")));
    
//     app.get("*",(req,res)=>{
//         res.sendFile(path.resolve(__dirname,"../build/index.html"));
//     })
// }
const io = socket(server,{
    cors:{
        origin:process.env.FRONTENDPORT,
        Credential:true
    }
})

global.onlineUsers = new Map();
io.on("connection", (socket)=>{
    global.chatsocket = socket;
    socket.on("addUser", (id=>{
        onlineUsers.set(id, socket.id);
    }))

    socket.on("send-msg",(data)=>{
        const sendUserSocket = onlineUsers.get(data.to);
        if(sendUserSocket){
            socket.to(sendUserSocket).emit("msg-receive", data.message);
        }
    })
    socket.on("sendNotify",({senderName, receiverName,postID,type,senderProfile,postImg,sendername})=>{
        const receiver = onlineUsers.get(receiverName)
        socket.to(receiver).emit("getNotification",{
            senderName,
            type,
            postID,
            senderProfile,
            postImg,
            sendername
        })
    })


})
//  let onlineUser = [];

//  const addNewUser = (userID, socketId) =>{
//     if(!onlineUser.some((user) => user.userID === userID))onlineUser.push({userID, socketId});
//  };
// const removeUser = (socketId) =>{
//     onlineUser = onlineUser.filter((user) => user.socketId !== socketId);
// };
// const getUser = (userID) =>{
//     return onlineUser.find(user => user.userID === userID);
// }
//  io.on("connection", (socket)=>{
//     socket.on("newUser", (userID)=>{
//         addNewUser(userID, socket.id);
//     });
    
//     socket.on("disconnect", ()=>{
//         // console.log("Someone has left!");
//         removeUser(socket.id);
//     });
//  })
