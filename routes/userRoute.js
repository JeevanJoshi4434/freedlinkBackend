const router = require('express').Router();
const User = require('../model/userModal');
const Notification = require('../model/NotificationModal');
const Message = require('../model/MessageModal');
const JobVerification = require('../model/JobVerification')
const VerificationToken = require('../model/VerificationToken');
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const fetchuser = require("../middleware/fetchUser");
const envConfig = require('../env/fetchEnv');
const verifyToken = require('../middleware/fetchUser');
const Post = require("../model/postModal");
const { generateOTP } = require("./Extra/mail");
const nodemailer = require('nodemailer');
const ResetToken = require('../model/ResetToken');
const crypto = require('crypto');
const Job = require('../model/jobModal');
const Report = require('../model/ReportModal');
const { MailtrapClient } = require("mailtrap");
const mongoose = require('mongoose');
var bson = require('bson');
require('dotenv').config({path:"./env/config.env"});
console.log(`server type: ${process.env.SERVER}`);
let success = false;
//Route 1: create a user using: POST "/api/auth/createuser".No login required
router.post("/signup/user",
  body('name').isLength({ min: 6 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body("country"),
  body("img")
  , async (req, res) => {
    const error = validationResult(req);
    var today = new Date();
    var year = today.getFullYear();
    var month = today.getMonth();
    var day = today.getDate();
    if (!error.isEmpty) {
      return res.status(400).json("Some error occured")
    }

    let user = await User.findOne({ email: req.body.email });
    if (user) {
      return res.status(200).json("Wrong Credentials!");
    };
    const salt = await bcrypt.genSalt(10);
    const secPass = await bcrypt.hash(req.body.password, salt)
    user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: secPass,
      country: req.body.country,
      img: req.body.img,
      createdYear: year,
      createdMonth: month,
      createdDay: day
    })
    const accessToken = jwt.sign({
      id: user._id,
      name: user.name
    }, process.env.JWT_SECRET)
    const OTP = generateOTP();
    const verificationToken = await VerificationToken.create({
      seller: user._id,
      token: OTP
    })
    verificationToken.save();
    await user.save();
    const TOKEN = `${process.env.mailTrapKey}`;
    const ENDPOINT = "https://send.api.mailtrap.io/";

    const client = new MailtrapClient({ endpoint: ENDPOINT, token: TOKEN });

    const sender = {
      email: "mailtrap@incutech.in",
      name: "Freedlink",
    };
    const recipients = [
      {
        email: user.email,
      }
    ];

    client
      .send({
        from: sender,
        to: recipients,
        subject: "Email Confirmation - Freedlink",
        html: `<h1>Your OTP Code Is: ${OTP}</h1><br><p>If it's not you so ignore it.</p>`,
        category: "Welcome",
      })
    // const transport = nodemailer.createTransport({
    //   host: "sandbox.smtp.mailtrap.io",
    //   port: 2525,
    //   auth: {
    //     user: process.env.mailTrapId,
    //     pass: process.env.mailTrapKey
    //   }
    // });
    // transport.sendMail({
    //   from: "friendlink@gmail.com",
    //   to: user.email,
    //   subject: "Email Verification Token",
    //   html: `<h1>Your OTP Code Is: ${OTP}</h1><br><p>If it's not you so ignore it.</p>`
    // })

    res.status(200).json({ status: "pending", msg: "Check your email for OTP", user: user._id });
    console.log(accessToken)

  })

// verify email
router.post("/verify/email", async (req, res) => {
  const { user, OTP } = req.body;
  const mainuser = await User.findById(user);
  if (!mainuser) return res.status(404).json("User not found");
  if (mainuser.verified === true) {
    return res.status(400).json("User already verified");
  };
  const token = await VerificationToken.findOne({ seller: mainuser._id });
  if (!token) {
    return res.status(404).json("Sorry User not found!");
  }
  const isMatch = await bcrypt.compareSync(OTP, token.token);
  if (!isMatch) return res.status(401).json("Wrong OTP!");
  mainuser.verified = true;
  await VerificationToken.findByIdAndDelete(token._id);
  await mainuser.save();
  const accessToken = jwt.sign({
    id: mainuser._id,
    name: mainuser.name
  }, process.env.JWT_SECRET)
  const { password, ...other } = mainuser._doc;
  const TOKEN = `${process.env.mailTrapKey}`;
  const ENDPOINT = "https://send.api.mailtrap.io/";

  const client = new MailtrapClient({ endpoint: ENDPOINT, token: TOKEN });

  const sender = {
    email: "mailtrap@incutech.in",
    name: "Freedlink",
  };
  const recipients = [
    {
      email: mainuser.email,
    }
  ];

  client
    .send({
      from: sender,
      to: recipients,
      subject: "Welcome - Freedlink",
      html: `<h1>Thank you</h1><br><h5>for joining us.</h5><br><p>your welcome ${other.name} to our website <a href="https://friendlink.com" target="__blank">https://friendlink.com</a></p>`,
      category: "Welcome",
    })
  // const transport = nodemailer.createTransport({
  //   host: "sandbox.smtp.mailtrap.io",
  //   port: 2525,
  //   auth: {
  //     user: process.env.mailTrapId,
  //     pass: process.env.mailTrapKey
  //   }
  // });
  // transport.sendMail({
  //   from: "friendlink@gmail.com",
  //   to: mainuser.email,
  //   subject: "Friendlink Account",
  //   html: `<h1>Thank you</h1><br><h5>for joining us.</h5><br><p>your welcome ${other.name} to our website <a href="https://friendlink.com" target="__blank">https://friendlink.com</a></p>`
  // })
  return res.status(200).json({ other, accessToken })

})

// Forgot password
router.post("/forgot/password", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json("User Not Found!");
  }
  const token = await ResetToken.findOne({ user: user._id });
  if (token) {
    return res.status(400).json("Wait for 5 minutes again!");
  }

  const RandomTxt = crypto.randomBytes(20).toString('hex');
  const resetToken = new ResetToken({
    user: user._id,
    token: RandomTxt
  });
  await resetToken.save();
  const TOKEN = `${process.env.mailTrapKey}`;
  const ENDPOINT = "https://send.api.mailtrap.io/";

  const client = new MailtrapClient({ endpoint: ENDPOINT, token: TOKEN });

  const sender = {
    email: "mailtrap@incutech.in",
    name: "Freedlink",
  };
  const recipients = [
    {
      email: user.email,
    }
  ];

  client
    .send({
      from: sender,
      to: recipients,
      subject: "Password Reset - Freedlink",
      html: `<h1>Requested For Password Reset?</h1><br><p>if it's not you Secure your Account! else Your reset token is: <a href=https://${`${process.env.PORT}/reset/password?token=${RandomTxt}&_id=${user._id}`} target="__blank">https://${process.env.PORT}/reset/password?token=${RandomTxt}&_id=${user._id}</a></p>`,
      // html: `hey ${mailTO.name} Congratulations!! your profile is sortlisted by ${user.name} (${twofectorcheck.CompanyName}) wait for their response. thank you.`,
      category: "Password Reset",
    })
  // const transport = nodemailer.createTransport({
  //   host: "sandbox.smtp.mailtrap.io",
  //   port: 2525,
  //   auth: {
  //     user:process.env.mailTrapId,
  //     pass: process.env.mailTrapKey
  //   }
  // });
  // transport.sendMail({
  //   from:"friendlink@gmail.com",
  //   to:user.email,
  //   subject:"Friendlink Account Password Reset",
  // })

  return res.status(200).json("Check your email to reset password");
})
// reset password verify
router.put("/reset/password", async (req, res) => {
  const { token, _id } = req.query;
  if (!token || !_id) {
    return res.status(400).json("Invalid request");
  }
  const user = await User.findOne({ _id: _id });
  if (!user) {
    return res.status(404).json("User not found!");
  }
  const resetToken = await ResetToken.findOne({ user: user._id });
  if (!resetToken) {
    return res.status(401).json("Token not Valid!");

  }
  const isMatch = await bcrypt.compareSync(token, resetToken.token);
  if (!isMatch) {
    return res.status(400).json('Token not Valid!');
  }

  const { password } = req.body;
  const salt = await bcrypt.genSalt(10);
  const secPass = await bcrypt.hash(password, salt);
  user.password = secPass;
  await user.save();
  const TOKEN = `${process.env.mailTrapKey}`;
  const ENDPOINT = "https://send.api.mailtrap.io/";

  const client = new MailtrapClient({ endpoint: ENDPOINT, token: TOKEN });

  const sender = {
    email: "mailtrap@incutech.in",
    name: "Freedlink",
  };
  const recipients = [
    {
      email: user.email,
    }
  ];

  client
    .send({
      from: sender,
      to: recipients,
      subject: "Password Reset - Freedlink",
      html: `<h1>Request for password reset completed </h1><br><p>now you can login with your password! <a href=${`https://${process.env.PORT}/`} target="__blank">https://${process.env.PORT}/login</a></p>`
      , category: "Password Reset",
    })
  //  const transport = nodemailer.createTransport({
  //   host: "sandbox.smtp.mailtrap.io",
  //   port: 2525,
  //   auth: {
  //     user:process.env.mailTrapId,
  //     pass: process.env.mailTrapKey
  //   }
  // });
  // transport.sendMail({
  //   from:"friendlink@gmail.com",
  //   to:user.email,
  //   subject:"Password Reset Successfully",
  // })
  return res.status(200).json("Password changed Successfully!");
})
// login
router.post("/login",
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty) {
      return res.status(400).json("Some error occured")
    }
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res.status(200).json("User not found")
      }

      const comparePass = await bcrypt.compare(req.body.password, user.password);
      if (!comparePass) {
        return res.status(400).json("Password error")
      }
      const accessToken = jwt.sign({
        id: user._id,
        name: user.name
      }, process.env.JWT_SECRET)
      const { password, ...other } = user._doc;
      res.status(200).json({ other, accessToken, success: true });
    } catch (error) {
      return res.status(400).json(`"Internal Server Error" ${error}`);
    }
  })
// change password 
router.put(`/user/change/password/:pass/:newpass`, verifyToken, async (req, res) => {
  let password = req.params.pass;
  let newPass = req.params.newpass;
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json(`user not found`);
  }

  const comparePass = await bcrypt.compare(password, user.password);
  if (!comparePass) return res.status(400).json("Password Error");
  const salt = await bcrypt.genSalt(10);
  const secPass = await bcrypt.hash(newPass, salt);
  const updatePass = await User.findByIdAndUpdate({ _id: req.user.id }, {
    $set: {
      password: secPass
    }
  });
  if (!updatePass) return res.status(500).json("Internal server Error!");
  res.status(200).json("Password Updated Successfully");
})

// update user Info
router.put(`/user/change/name/:name/:pass`, verifyToken, async (req, res) => {
  let name = req.params.name;
  let password = req.params.pass;
  console.log({ name: name, pass: password });
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json(`user not found`);
  }
  const comparePass = await bcrypt.compare(password, user.password);
  if (!comparePass) return res.status(400).json("Password Error");
  const updatePass = await User.findByIdAndUpdate({ _id: req.user.id }, {
    $set: {
      name: name
    }
  });
  if (!updatePass) return res.status(500).json("Internal server Error!");
  res.status(200).json("Name Updated Successfully");

})
router.put(`/user/change/mail/:email/:pass`, verifyToken, async (req, res) => {
  let name = req.params.email;
  let password = req.params.pass;
  console.log({ name: name, pass: password });
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json(`user not found`);
  }
  const comparePass = await bcrypt.compare(password, user.password);
  if (!comparePass) return res.status(400).json("Password Error");
  const checkEmail = await User.findOne({ email: name });
  if (checkEmail) return res.status(200).json("Email Already Exist")
  const updatePass = await User.findByIdAndUpdate({ _id: req.user.id }, {
    $set: {
      email: name
    }
  });
  if (!updatePass) return res.status(500).json("Internal server Error!");
  res.status(200).json("Name Updated Successfully");

})
// Following

router.put("/follow/:id", verifyToken, async (req, res) => {
  if (req.params.id !== req.user.id) {
    const users = await User.findById(req.params.id);
    const otheruser = await User.findById(req.user.id);

    if (!users.followers.includes(req.user.id)) {
      await users.updateOne({ $push: { followers: req.user.id } });
      await otheruser.updateOne({ $push: { following: req.params.id } });
      res.status(200).json("User has followed!");
    } else {
      return res.status(400).json("Already Following!");
    }
  } else {
    return res.status(400).json("You can't follow yourself!")
  }
})

// unfollow 
router.put("/unfollow/:id", verifyToken, async (req, res) => {
  if (req.params.id !== req.user.id) {
    const users = await User.findById(req.params.id);
    const otheruser = await User.findById(req.user.id);

    if (users.followers.includes(req.user.id)) {
      await users.updateOne({ $pull: { followers: req.user.id } });
      await otheruser.updateOne({ $pull: { following: req.params.id } });
      res.status(200).json("User has Unfollowed!");
    } else {
      return res.status(400).json("Already Unfollowed!");
    }
  } else {
    return res.status(400).json("You can't follow-unfollow yourself!")
  }
})
//fetch post from followers
router.get("/feed/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const followersPost = await Promise.all(
      user.following.map((item) => {
        return Post.find({ user: item }).sort({ createdAt: -1 })
      })
    )
    res.status(200).json({ followersPost, success: true });
  } catch (error) {
    return res.status(500).json("Internal server Error!")
  }
})
// Like and Dislike
router.put("/:id/like", verifyToken, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json("Post not found! or Deleted by user")
  }
  if (!post.like.includes(req.user.id)) {
    await post.updateOne({ $push: { like: req.user.id } })
    return res.status(200).json("Post liked!")
  } else {
    await post.updateOne({ $pull: { like: req.user.id } })
    return res.status(200).json("Post disliked!")
  }
})

// comment
router.put("/comment/post", verifyToken, async (req, res) => {
  try {
    const { comment, postid } = req.body;
    const comments = {
      user: req.user.id,
      username: req.user.name,
      comment
    }
    const post = await Post.findById(postid);
    post.comments.push(comments);
    await post.save(); res.status(200).json({ post, success: true })
  } catch (error) {
    return res.status(500).json("Internal server error!")
  }
})

// reply to a comment still pending (and react also)

// Update user Profile
router.put("/update/:id", verifyToken, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      const oldPass = await User.findById(req.params.id)
      const comparePass = await bcrypt.compare(req.body.oldPassword, oldPass.password);
      if (!comparePass) {
        return res.status(400).json("Check Old Password")
      } else {
        if (req.body.password) {
          const newPass = req.body.password;
          const salt = await bcrypt.genSalt(10);
          const secPass = await bcrypt.hash(newPass, salt);
          req.body.password = secPass;
          const updateuser = await User.findByIdAndUpdate(req.params.id, {
            $set: req.body
          });
          res.status(200).json({ updateuser, success: true });
        }
      }
    } else {
      return res.status(400).json("Not Allowed!!")
    }
  } catch (error) {
    return res.status(500).json("Internal server error")
  }
})

// delete user Account
router.delete("/delete/:id", verifyToken, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(400).json("Account doesn't match")
    } else {
      // updating some feature
      const oldPass = await User.findById(req.params.id)
      const comparePass = await bcrypt.compare(req.body.oldPassword, oldPass.password);
      if (!comparePass) {
        return res.status(400).json("Enter correct password!")
      } else {
        await Post.findByIdAndDelete({ user: req.params.id });
        await User.findByIdAndDelete(req.params.id);
        return res.status(200).json("Account has been deleted successfully!", { success: true })
      }
    }
  } catch (error) {
    return res.status(500).json("Internal server error!")
  }
})

//get user details for post
router.get('/post/user/details/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(400).json("User not found!");
    }
    const { email, password, followers, following, ...other } = user._doc;
    res.status(200).json(other);
  } catch (error) {
    res.status(500).json("Internal server Error!");

  }
})

//get user details
router.get('/user/details/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(400).json("User not found!");
    }
    const { password, ...other } = user._doc;
    res.status(200).json(other);
  } catch (error) {
    res.status(500).json("Internal server Error!");

  }
})

// get suggestion users
router.get('/all/user', verifyToken, async (req, res) => {
  try {
    const allUser = await User.find();
    const user = await User.findById(req.user.id);
    const followingUser = await Promise.all(
      user.following.map((item) => {
        return item;
      })
    )
    let UserToFollow = allUser.filter((val) => {
      return !followingUser.find((item) => {
        return val._id.toString() === item;
      })
    })
    let filteruser = await Promise.all(
      UserToFollow.map((item) => {
        const { password, ...other } = item._doc;
        return other
      })
    )
    res.status(200).json(filteruser)
  } catch (error) {

  }
})

// get user details 
router.get("/me", verifyToken, async (req, res) => {
  try {
    const userDetails = await User.findById(req.user.id);
    const { password, ...other } = userDetails._doc;
    res.status(200).json(other);

  } catch (error) {
    return res.status(500).json("Internal server error!");
  }
})

// get following user 
router.get("/following/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const followingUser = await Promise.all(
      user.following.map((item) => {
        return User.findById(item)
      })
    )
    let followingList = [];
    followingUser.map((person) => {
      const { password, email, following, followers, ...followings } = person._doc;
      followingList.push({ followings });
    })

    res.status(200).json(followingList);
  } catch (error) {

  }
})

// get followers user 
router.get("/follower/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const followerUser = await Promise.all(
      user.followers.map((item) => {
        return User.findById(item)
      })
    )
    let followerList = [];
    followerUser.map((person) => {
      const { password, email, following, followers, ...follower } = person._doc;
      followerList.push({ follower });
    })

    res.status(200).json(followerList);
  } catch (error) {

  }
})

// add more details -->
router.put(`/me/update/bio`, verifyToken, async (req, res) => {
  const { Bio } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(403).json(`"Unauthorized!" ${user}`);
    }
    const data = await user.updateOne({ aboutBio: Bio });
    res.status(200).json(data);
  } catch (error) {
    return res.status(500).json(`Internal server Error ${error}`)
  }

})
router.put(`/me/update/skill`, verifyToken, async (req, res) => {
  const { skill } = req.body;
  // try {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(403).json("Unauthorized!");
  }
  // const dta = await user.skills.skill.push(skill)
  const data = await user.updateOne({ $push: { skills: skill } });
  res.status(200).json(data);
  // } catch (error) {
  //   return res.status(500).json("Internal Server Error");
  // }
})
router.put(`/me/update/skill/delete`, verifyToken, async (req, res) => {
  const { skill } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(403).json("Unauthorized");
    }
    const dlte = await User.updateOne({ _id: req.user.id }, {
      $pull: { skills: skill }
    })
    // const dlt = await user.update({_id:req.user.id})
    res.status(200).json(dlte)
  } catch (error) {
    return res.status(500).json(`Internal server Error ${error}`);
  }
})
router.put(`/me/update/education`, verifyToken, async (req, res) => {
  const { universityName, degree, From, To } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(400).json("Login to access this resource");
    }
    const data = await user.updateOne({
      $push: {
        education: {
          universityName: universityName,
          degree: degree,
          fromTo: { dateFrom: From, dateTo: To }
        }
      }
    })
    res.status(200).json(data);
  } catch (error) {
    return res.status(500).json(`  Internal server error ${error}`)
  }
})
router.put(`/me/update/education/delete`, verifyToken, async (req, res) => {
  const { universityName, degree, id } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(400).json("Login to access this resource");
    }
    const dlte = await User.updateOne({ _id: req.user.id }, {
      $pull: {
        education: {
          _id: id
        }
      }
    })
    res.status(200).json(dlte);
  } catch (error) {
    return res.status(500).json(`  Internal server error ${error}`)
  }
})
router.put(`/me/update/currentwork`, verifyToken, async (req, res) => {
  const { Position, Name, Experience, to, from, current } = req.body;
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(403).json("Unauthorized!");
    }
    const data = await user.updateOne({
      $push: {
        company: {
          positionCompany: Position,
          nameCompany: Name,
          experienceWork: Experience,
          yearTo: to,
          yearFrom: from,
          current: current,
        }
      }
    })
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json(`Internal server Error ${error}`)

  }
})
router.put(`/me/update/currentwork/delete`, verifyToken, async (req, res) => {
  const { Position, Name, from } = req.body;
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(403).json("Unauthorized!");
    }
    const data = await User.updateOne({ _id: req.user.id }, {
      $pull: {
        company: {
          positionCompany: Position,
          nameCompany: Name,
          yearFrom: from,
        }
      }
    })
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json(`Internal server Error ${error}`)

  }
})
router.put(`/me/update/shortbio`, verifyToken, async (req, res) => {
  const { shortbio } = req.body;
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(403).json("Unauthorized!");
    }
    const data = await user.updateOne({ shortBio: shortbio })
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json(`Internal server Error ${error}`)

  }

})
router.put(`/me/update/shortbio/delete`, verifyToken, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(403).json("Unauthorized!");
    }
    const data = await User.updateOne({ _id: req.user.id }, { shortBio: "" })
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json(`Internal server Error ${error}`)

  }

})
router.put(`/me/update/project`, verifyToken, async (req, res) => {
  const { title, more, webLink } = req.body;
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(403).json("Unauthorized!");
    }
    const data = await user.updateOne({
      $push: {
        project: {
          projectTitle: title,
          projectDescription: more,
          projectWebsite: webLink,
        }
      }
    })
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json(`Internal server Error ${error}`)

  }
})
router.put(`/me/update/project/delete`, verifyToken, async (req, res) => {
  const { title, more, webLink } = req.body;
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(403).json("Unauthorized!");
    }
    const data = await User.updateOne({ _id: req.user.id }, {
      $pull: {
        project: {
          projectTitle: title,
          projectDescription: more,
          projectWebsite: webLink,
        }
      }
    })
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json(`Internal server Error ${error}`)

  }
})
router.put(`/me/update/project/modify`, verifyToken, async (req, res) => {
  const { title, more, webLink } = req.body;
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(403).json("Unauthorized!");
    }
    const data = await User.updateOne({ _id: req.user.id }, {
      $push: {
        project: {
          projectTitle: title,
          projectDescription: more,
          projectWebsite: webLink,
        }
      }
    })
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json(`Internal server Error ${error}`)

  }
})
// Unsave the post
router.put(`/post/remove/:user/:id`, async (req, res) => {
  let id = req.params.id;
  const user = await User.updateOne({ _id: req.params.user }, {
    $pull: {
      savedPost: id
    }
  })
  if (!user) {
    return res.status(403).json("Please login first");
  }
  res.status(200).json("success");
})
// save post
router.put(`/post/save/:user/:id`, async (req, res) => {
  let id = req.params.id;
  const user = await User.updateOne({ _id: req.params.user }, {
    $push: {
      savedPost: id
    }
  })
  if (!user) {
    return res.status(403).json("Please login first");
  }
  res.status(200).json("success");
})

// get saved post
router.get(`/post/saved/:id`, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(403).json("Please login first");
  }
  // const data = await Post.findById(req.user.savedPost);
  const savedPost = await Promise.all(
    user.savedPost.map((item) => {
      return Post.findById(item)
    })
  )
  let savedPostList = [];
  savedPost.map((person) => {
    // const {data} = person._doc;
    savedPostList.push(person);
  })
  res.status(200).json({ posts: savedPostList });
})

// dont's see the post again !! -- Action
router.put(`/post/ignore/:user/:id`, async (req, res) => {
  let id = req.params.id;
  const user = await User.updateOne({ _id: req.params.user }, {
    $push: {
      notInterested: id
    }
  })
  if (!user) {
    return res.status(403).json("Please login first");
  }
  res.status(200).json("success");
})

router.post(`/report`, verifyToken, async (req, res) => {
  const { type, title, to, desc, img } = req.body;
  const data = Report.create({
    type: type,
    desc: desc,
    title: title,
    reportedTo: to,
    reportedBy: req.user.id,
    img: img
  })
  res.status(200).json(data);
});
router.get(`/allreports`, verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  const access = user.role.includes("Admin");
  if (!access) {
    return res.status(403).json("Unauthorized!");
  }
  const data = await Report.find().sort({ createdAt: -1 });
  res.status(200).json(data);
})
router.get(`/reports/post`, verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  const access = user.role.includes("Admin");
  if (!access) {
    return res.status(403).json("Unauthorized!");
  }
  const data = await Report.find({ type: "POST" }).sort({ updatedAt: -1 });
  res.status(200).json(data);
})
router.get(`/reports/message`, verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  const access = user.role.includes("Admin");
  if (!access) {
    return res.status(403).json("Unauthorized!");
  }
  const data = await Report.find({ type: "MESSAGE" }).sort({ updatedAt: -1 });
  res.status(200).json(data);
})
router.get(`/reports/system`, verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  const access = user.role.includes("Admin");
  if (!access) {
    return res.status(403).json("Unauthorized!");
  }
  const data = await Report.find({ type: "SYSTEM" }).sort({ updatedAt: -1 });
  res.status(200).json(data);
})
router.get(`/reports/job`, verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  const access = user.role.includes("Admin");
  if (!access) {
    return res.status(403).json("Unauthorized!");
  }
  const data = await Report.find({ type: "JOB" }).sort({ updatedAt: -1 });
  res.status(200).json(data);
})
router.get(`/reports/profile`, verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  const access = user.role.includes("Admin");
  if (!access) {
    return res.status(403).json("Unauthorized!");
  }
  const data = await Report.find({ type: "PROFILE" }).sort({ updatedAt: -1 });
  res.status(200).json(data);
})
router.get(`/users/all`, verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  const access = user?.role?.includes("Admin");
  if (!access) {
    return res.status(403).json("Unauthorized!");
  }
  const data = await User.find();
  res.status(200).json(data);
})
router.delete(`/users/delete/:admin/:userID`, async (req, res) => {
  const userId = req.params.userID;
  const user = await User.findById(req.params.admin);
  const access = user.role.includes("Admin");
  if (!access) {
    return res.status(403).json("Unauthorized!");
  } else {
    const data = await User.findByIdAndDelete(userId);
    res.status(200).json(data);
  }
})
router.post(`/user/upgrade/professional/:id`, verifyToken, async (req, res) => {
  const { CNo, SEmail, Address, CName, GSTNum, Sector,credit } = req.body;
  const user = await User.findById(req.params.id);
  if (user.role.includes("HR")) {
    return res.status(403).json("Already have an Account");
  }
  if (user.role.includes("Admin")) {
    return res.status(403).json("You are a Admin");
  }
  try {
    const data = await User.updateOne({ _id: req.params.id }, {
      contactNo: CNo,
      yourCompany: CName,
      officeAddress: Address,
      officeEmail: SEmail,
      sector: Sector,
      GSTNumber: GSTNum,
      isHR: true,
      role: "HR",
      credits:credit
    });
    res.status(200).json(data);
  } catch (error) {
    return res.status(500).json('Internal server Error!');
  }
})

router.put(`/notification/push/:user/:post`, verifyToken, async (req, res) => {
  const isExist = await Post.findById(req.params.post);
  if (!isExist) return res.status(404).json(`Post not found may be deleted!`);
  const update = await Notification.create(
    {
      senderName: req.user.id,
      receiverName: req.params.user,
      postID: req.params.post,
      notifytype: req.body.type,
      senderProfile: req.body.senderProfile,
      postImg: req.body.postImg,
      sender: req.body.name
    });

  if (!update) return res.status(403).json("something error happened!");
  res.status(200).json(update);
})
router.put(`/notification/follow/:user`, verifyToken, async (req, res) => {
  const isExist = await User.findById(req.params.user);
  if (!isExist) return res.status(404).json(`User not found may be deleted!`);
  const update = await Notification.create(
    {
      senderName: req.user.id,
      receiverName: req.params.user,
      postID: req.params.post,
      notifytype: req.body.type,
      senderProfile: req.body.senderProfile,
      postImg: req.body.postImg,
      sender: req.body.name
    });

  if (!update) return res.status(403).json("something error happened!");
  res.status(200).json(update);
})

router.get(`/notification/post/:id`, verifyToken, async (req, res) => {
  const post = await Post.findById(req.params.id);
  res.status(200).json(post)
})
router.get(`/notification/user/:id`, verifyToken, async (req, res) => {
  const user = await User.findById(req.params.id);
  const { GSTNumber, notifications, email, password, contactNo, country, company, education, aboutBio, project, skills, role, followers, following, verified, shortBio, yourCompany, officeAddress, officeEmail, sector, isHR, notInterested, savedPost, blockedUser, enrolled, ...data } = user._doc;
  res.status(200).json(data);
})
router.get(`/notification/all`, verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  // const {GSTNumber,email,password,contactNo,country,company,education,aboutBio,project,skills,role,followers,following,verified,shortBio,yourCompany,officeAddress,officeEmail,sector,isHR,notInterested,savedPost,blockedUser,enrolled, ...data} = user._doc;
  const FilterNotify = await Promise.all(
    user.notifications.map((item) => {
      return item;
    })
  )
  let FilterNotifyList = [];
  FilterNotifyList.push(FilterNotify);
  const sorted = [...FilterNotifyList].sort({ creaedOn: -1 });
  res.status(200).json(sorted);
})

router.get("/get/notification/:user", async (req, res) => {
  try {
    const newNotification = await Notification.find({ receiverName: req.params.user }).sort({ updatedAt: -1 });
    // console.log(newNotification)
    const allMessage = newNotification.map((msg) => {
      return {
        postImg: msg.postImg,
        senderID: msg.senderName,
        recieverID: msg.receiverName,
        type: msg.notifytype,
        postID: msg.postID,
        sendername: msg.sender,
        senderprofile: msg.senderProfile,
      }
    })

    return res.status(200).json({ notify: allMessage });
  } catch (error) {
    res.status(500).json(`Internal server error: ${error}`)
  }
})


const visitorSchema = new mongoose.Schema({
  name:{
    type:String,
  },
  count:{
    type:Number,
  }
})
const Visitor = mongoose.model("visitors", visitorSchema)
router.get(`/visitors`, async(req,res)=>{
  let visitors = await Visitor.findOne({name: 'Guest'})
  
  // If the app is being visited first
  // time, so no records
  if(visitors == null) {
        
      // Creating a new default record
      const beginCount = new Visitor({
          name : 'Guest',
          count : 1
      })

      // Saving in the database
      beginCount.save()

      // Sending the count of visitor to the browser
      res.send(`<h2>Counter: `+1+'</h2>')

  }
  else{
        
      // Incrementing the count of visitor by 1
      visitors.count += 1;

      // Saving to the database
      visitors.save()

      // Sending the count of visitor to the browser
      res.send(`<h2>Counter: `+visitors.count+'</h2>')

      // Logging the visitor count in the console
      console.log("visitor arrived: ",visitors.count)
  }
})
router.get(`/visitors/all`,async(req,res)=>{
  const visitors = await Visitor.findOne({name:"Guest"});
  if(visitors === null)return res.status(200).json(0);
  res.status(200).json(visitors.count);
})
router.get(`/allusers`,async(req,res)=>{
  const users = await User.countDocuments();
  res.status(200).json(users);
})
router.get(`/allposts`,async(req,res)=>{
  const posts = await Post.countDocuments();
  res.status(200).json(posts);
})
router.get(`/totalreports`,async(req,res)=>{
  const reports = await Report.countDocuments();
  res.status(200).json(reports);
})
router.get(`/alljobs`,async(req,res)=>{
  const jobs = await Job.countDocuments();
  res.status(200).json(jobs);
})
router.get(`/allnotifications`,async(req,res)=>{
  const notify = await Notification.countDocuments();
  res.status(200).json(notify);
})
router.get(`/verifypendingusers`, async(req,res)=>{
  const users = await User.countDocuments({verified:false});
  res.status(200).json(users);
})
router.get(`/verifiedusers`, async(req,res)=>{
  const users = await User.countDocuments({verified:true});
  res.status(200).json(users);
})
router.get(`/post/all`, async(req,res)=>{
  const {_month , _year }= req.query;

  const posts = await Post.countDocuments({timestamp:{
    year:_year
  }});
  res.status(200).json(posts);
})
router.get(`/databasesize`, async(req,res)=>{ 
  const users = await User.countDocuments();
  const posts = await Post.countDocuments();
  const reports = await Report.countDocuments();
  const notify = await Notification.countDocuments();
  const jobs = await Job.countDocuments();
  const token = await VerificationToken.countDocuments();
  const message = await Message.countDocuments();
  const totalmessage = await message *(220 * 0.001);
  const totalJobs = await jobs * 1.32;
  const totalUsers = await users * 1.32;
  const totalNotify = await notify * (400 * 0.001);
  const totalReports = await reports * (350 * 0.001);
  const totalPosts = await posts * (607 * 0.001);
  const totaltokens = await token * (122 * 0.001);
  const totalStorage = await (totalJobs+totalNotify+totalmessage+totalUsers+totalReports+totalPosts+totaltokens ) * 0.001;
  res.status(200).json(totalStorage);
})
router.post(`/jobverification`, async(req,res)=>{
  // const user = await User.findById(req.user.id);
  // const access = user.role.includes('admin');
  // if(!access){
  //   return res.status(301).json('User not Allowed!');
  // }
  const create = await JobVerification.findOne({name:"JobVerification"});
  if(create) return res.status(301).json("Already Exist!");
  const createVerification = await JobVerification.create({
    name:"JobVerification",
    stopJobUpload:false
  })
  res.status(200).json(createVerification);
})
router.get(`/jobstatus`, async(req,res)=>{
  const create = await JobVerification.findOne({name:"JobVerification"});
  if(create) return res.status(200).json(create.stopJobUpload);
  const createVerification = await JobVerification.create({
    name:"JobVerification",
    stopJobUpload:false
  })
  res.status(200).json(createVerification);
})

router.put(`/stopUpload`,verifyToken, async(req,res)=>{
  const user = await User.findById(req.user.id);
  const access = user.role.includes('user');
  if(access){
    return res.status(301).json('User not Allowed!');
  }
  const update = await JobVerification.findOne({name:"JobVerification"});
  if(!update) return res.status(404).json("Access not found!");
  if(update.stopJobUpload){
    const updateData = await JobVerification.findOneAndUpdate({name:"JobVerification"},{
      $set:{
        stopJobUpload:false
      }
    })
    res.status(200).json({massage:"stopped!",data:updateData});
  }else{
    const updateData2 = await JobVerification.findOneAndUpdate({name:"JobVerification"},{
      $set:{
        stopJobUpload:true
      }
    })
    res.status(200).json({massage:"continue!",data:updateData2});
    
  }
})

router.put(`/verifypost/:id`,verifyToken, async(req,res)=>{
  const user = await User.findById(req.user.id);
  if(user.role == "user") return res.status(301).json("You aren't allowed to make changes!");
  const post = await Job.findOneAndUpdate({_id:req.params.id},{
      $set:{
        visible:true
      }}
      )

  res.status(200).json("Verified!");
})

router.get(`/job-approval`,verifyToken,async(req,res)=>{
  const user = await User.findById(req.user.id);
  if(user.role.includes("user")) return res.status(301).json("Authentication failed!");
  const job = await Job.find({visible:false});
  res.status(200).json(job);
})

router.delete(`/job-denied/:id`,verifyToken,async(req,res)=>{
  const user = await User.findById(req.user.id);
  if(user.role.includes("user")) return res.status(401).json("Authentication failed!");
  const post = await Job.findByIdAndDelete(req.params.id);
  if(!post) return res.status(404).json("Post not found!")
  res.status(200).json("Deleted Successfully");
})
module.exports = router;