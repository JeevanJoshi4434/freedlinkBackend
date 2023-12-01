const router = require('express').Router();
const verifyToken = require('../middleware/fetchUser');
const User = require('../model/userModal');
const Post = require('../model/postModal');
const mongoose = require('mongoose');
const Message = require('../model/MessageModal');
// const { isValidObjectId } = require('mongoose');
let success = false;
require('dotenv').config({path:"./env/config.env"});
router.post("/create/post", async (req, res) => {
    try {
        let { title, image } = req.body;
        let newpost = await Post.create({
            title, image, user: req.body.userId,
        })
        res.status(200).json(newpost);
    } catch (error) {
        return res.status(500).json(`"Internal server error" ${error}`)
    }
})

//uploaded post by one user
router.get("/get/post/:id", async (req, res) => {
    let {_page,_limits} = req.query;
    try {
        const mypost = await Post.find({ user: req.params.id }).sort({createdAt:-1}).skip((_page-1)*_limits).limit(_limits);
        if (!mypost) {
            return res.status(200).json("you don't have any Post", { success: true })
        }
        res.status(200).json({ mypost, success: true });
    } catch (error) {
        return res.status(500).json("Internal server error!");
    }
})

// update user post

router.put("/update/post/:id", verifyToken, async (req, res) => {
    try {
        let post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json("Post not found!");
        };
        post = await Post.findByIdAndUpdate(req.params.id, {
            $set: req.body
        })
        let updatepost = await post.save();
        res.status(200).json({
            updatepost,
            success: true
        });
    } catch (error) {
        res.status(500).json(`Internal server Error`);
    }
})
// Uploaded post by other users
router.get("/get/feed/:id", async (req, res) => {
    const me = await User.findById(req.params.id)
    const feed = await Post.find({ user: me.following }).sort({createdAt:-1});
    if (!feed) res.status(400).json("Connection refussed!");
    res.status(200).json({ feed });

})
router.get("/get/feed/:id/posts", async (req, res) => {
    const {_limits,_page}=req.query;
    if(!_limits&&!_page) return res.status(400).json("Invalid request");
    const me = await User.findById(req.params.id)
    const feed = await Post.find({ user: me.following }).sort({createdAt:-1}).skip((_page-1)*_limits).limit(_limits);
    res.status(200).json({ feed });
    if (!feed) res.status(400).json("Connection refussed!");

})
router.get("/get/post", async (req, res) => {
    // const me = await User.findById(req.params.id)
    // const feed = await Post.find({ /user: me.following }).sort({createdAt:-1}).skip((_page-1)*_limits).limit(_limits);
    try {
        
        const feeds = await Post.aggregate([{$sample:{size: 4}}]);
    res.status(200).json({ feeds });
    if (!feeds) res.status(400).json("Connection refussed!");
} catch (error) {
    console.log(error)
}

})
router.get(`/single/post/:id`,async(req,res)=>{
    const id = req.params;
    try {
        const post = await Post.findById(mongoose.Types.ObjectId(id));
        if(!post) return res.status(404).json('post note found!');
        res.status(200).json(post);
        
    } catch (error) {
    
    }
})



// delete Id
router.delete("/delete/post/:id", verifyToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (JSON.stringify(post.user) !== JSON.stringify(req.user.id))
         return res.status(400).json("you are not allowed to delete");
       
        const deletepost = await Post.findByIdAndDelete(req.params.id);
         res.status(200).json('Your post has been deleted!')
    } catch (error) {

    }
})
// create message

router.post("/msg", verifyToken, async (req, res) => {
    try {

        const { from, to, message } = req.body;
        const newMessage = await Message.create({
            message: message,
            ChatUsers: [from, to ],
            Sender: from
        })

        return res.status(200).json(newMessage);
    } catch (error) {
            res.status(500).json(`Internal server error`)
    }
})

//get msg

router.get("/get/chat/msg/:user1Id/:user2Id", async(req, res) => {
    try {
            const from = req.params.user1Id;
            const to = req.params.user2Id;

            const newMessage = await Message.find({
                ChatUsers:{
                    $all:[from,to]
                }
            }).sort({updatedAt:1});

            const allMessage = newMessage.map((msg)=>{
                return {
                    myself:msg.Sender.toString() === from,
                    message: msg.message,
                    time:msg.time
                }
            })

            return res.status(200).json(allMessage);
    } catch (error) {
            res.status(500).json(`Internal server error: ${error}`)
    }
})

// users filter & display
router.get(`/inbox/allUser`, verifyToken, async(req,res)=>{
    const user = await Message.find({ChatUsers:req.user.id})
    if(!user){
        return res.status(200).json('no record found');
    }
    const allUsers = await Message.find({
        ChatUsers:{
        $all:user
        }
    }).sort({updatedAt:-1});

    const filterUsers = allUsers.map((msg)=>{
        return {
            myself:msg.Sender.toString() === user,
                    message: msg.message,
                    time:msg.time
        }
    })
    res.status(200).json({all:allUsers, filterUsers:filterUsers,userId:user});
})

router.get(`/posts/num`,async(req,res)=>{

    
    const totalPosts = await Post.countDocuments();
    const allPosts = await Post.find();
    res.status(200).json({total:totalPosts,allPosts:allPosts})
})

module.exports = router;
