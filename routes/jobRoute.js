const router = require('express').Router();
const Job = require("../model/jobModal");
const User = require('../model/userModal');
const Interest = require('../model/InterestModal');
const verifyToken = require('../middleware/fetchUser');
const nodemailer = require('nodemailer');
const { MailtrapClient } = require("mailtrap");
require('dotenv').config({ path: "./env/config.env" });
const JobVerification = require('../model/JobVerification');
router.post("/jobs/upload/:id", async (req, res) => {
    try {
        let { currentWork, numOfEmployee, routineType, link, skills, title, img, description, experienceAboveSector, CompanyName, qualification, workExperience, subject, country, Email, referenceCompanyName, state, city, } = req.body;
        const user = await User.findById(req.params.id);
        const access = user.role.includes("HR");
        const jobverification = await JobVerification.findOne({ name: "JobVerification" });
        if (access) {
            if (jobverification.stopJobUpload === false) {
                let newJob = await Job.create({
                    title: title,
                    link,
                    user: req.params.id,
                    subject: subject,
                    description: description,
                    image: img,
                    country: country,
                    officeEmail: Email,
                    CompanyName: CompanyName,
                    qualification: qualification,
                    workExperience: workExperience,
                    experienceAboveSector: experienceAboveSector,
                    referenceCompanyName: referenceCompanyName,
                    currentWork: currentWork,
                    routineType: routineType,
                    visible: true,
                    numOfEmployee: numOfEmployee,
                    skills: [{
                        skills
                    }],
                    Address: [{
                        country: country, state: state, City: city
                    }]

                })
                return res.status(200).json({ newJob, updateUser });
            }
            if (jobverification.stopJobUpload === true) {
                let newJob = await Job.create({
                    title: title,
                    user: req.params.id,
                    subject: subject,
                    description: description,
                    image: img,
                    country: country,
                    officeEmail: Email,
                    CompanyName: CompanyName,
                    qualification: qualification,
                    workExperience: workExperience,
                    experienceAboveSector: experienceAboveSector,
                    referenceCompanyName: referenceCompanyName,
                    currentWork: currentWork,
                    routineType: routineType,
                    visible: false,
                    numOfEmployee: numOfEmployee,
                    skills: [{
                        skills
                    }],
                    Address: [{
                        country: country, state: state, City: city
                    }]
                })
                return res.status(200).json(newJob);
            }
        }
        res.status(403).json("User not allowed!");
    }
    catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
})

router.post(`/interest/:id`, async (req, res) => {
    const user = await User.findById(req.params.id);
    const access = user.role.includes("HR");
    if (access) {
        let newData = Interest.create({
            fields: req.body.name
        })
        return res.status(200).json({ newData })
    }
})

router.delete(`/job/delete/:jobId/:user`, async (req, res) => {
    const user = await User.findById(req.params.user);
    const access = user.role.includes("HR");
    if (access) {
        const twofectorcheck = await Job.findById(req.params.jobId);
        if (twofectorcheck.user === req.params.user) {
            const deleteJob = await Job.findByIdAndDelete(req.params.jobId);
            res.status(200).json(deleteJob);
        }
        res.status(403).json(`Unauthorized`);
    }
    res.status(401).json(`Unauthorized`);
})

router.put(`/job/:jobID/:userID`, verifyToken, async (req, res) => {
    const auth = await User.findById(req.params.userID);
    const job = await Job.findById(req.params.jobID);
    const author = await User.findById(job.user);
    if (!author) return res.status(404);
    if (auth.enrolled.includes(req.params.jobID)) {
        return res.status(409).json("Already Exist");
    }
    if (author.credits < 4) return res.status(410).json("No more acceptance");
    const user = await Job.updateOne({ _id: req.params.jobID }, {
        $push: {
            enrolled: req.params.userID
        }
    })
    const userEnroll = await User.updateOne({ _id: req.params.userID }, {
        $push: {
            enrolled: req.params.jobID
        }
    })
    const updateUser = await User.updateOne({ _id: author }, {
        $set: {
            credits: author.credits - 3
        }
    })
    res.status(200).json({ user: userEnroll, Post: user });

})

router.put(`/job/user/pull/:userId/:jobId/:id`, async (req, res) => {
    const user = await User.findById(req.params.id);
    const access = user.role.includes("HR");
    if (access) {
        const twofectorcheck = await Job.findById(req.params.jobId);
        if (JSON.stringify(twofectorcheck.user) === JSON.stringify(req.params.id)) {
            const deleteJob = await Job.updateOne({ _id: req.params.jobId }, {
                $pull: {
                    enrolled: req.params.userId
                }
            })
            res.status(200).json(deleteJob);
        }
    }
})

router.put(`/job/user/push/:userId/:jobId/:id`, async (req, res) => {
    const user = await User.findById(req.params.id);
    const access = user.role.includes("HR");
    if (access) {
        const twofectorcheck = await Job.findById(req.params.jobId);
        if (JSON.stringify(twofectorcheck.user) === JSON.stringify(req.params.id)) {
            const Jobshort = await Job.updateOne({ _id: req.params.jobId }, {
                $push: {
                    sortlist: req.params.userId
                }, $pull: {
                    enrolled: req.params.userId
                }
            })
            const mailTO = await User.findById(req.params.userId);
            const useremail = mailTO.email;
            // const transport = nodemailer.createTransport({
            //     host: "live.smtp.mailtrap.io",
            //     port: 587,
            //     auth: {
            //         user: process.env.mailTrapId,
            //         pass: process.env.mailTrapKey
            //     }
            // });
            // transport.sendMail({
            //     to: useremail,
            //     subject: "Profile Shortlist - Freedlink",
            //     html: `<h1>hey ${mailTO.name} Congratulations!! your profile is sortlisted by ${user.name} (${twofectorcheck.CompanyName})<br> wait for their response. <br> thank you.<h1>`
            // })
            const TOKEN = `${process.env.mailTrapKey}`;
            const ENDPOINT = "https://send.api.mailtrap.io/";

            const client = new MailtrapClient({ endpoint: ENDPOINT, token: TOKEN });

            const sender = {
                email: "mailtrap@incutech.in",
                name: "Freedlink",
            };
            const recipients = [
                {
                    email: useremail,
                }
            ];

            client
                .send({
                    from: sender,
                    to: recipients,
                    subject: "Profile Shortlist - Freedlink",
                    text: `hey ${mailTO.name} Congratulations!! your profile is sortlisted by ${user.name} (${twofectorcheck.CompanyName}) wait for their response. thank you.`,
                    category: "Celebration",
                })
            res.status(200).json(Jobshort);
        }
    }
});
router.get(`/jobs`, async (req, res) => {
    let { _page, _limits, _visible } = req.query;
    const data = await Job.find({ visible: _visible }).sort({ createdAt: -1 }).skip((_page - 1) * _limits).limit(_limits);
    res.status(200).json(data);
});
router.get(`/jobs/:id`, async (req, res) => {
    const data = await Job.findById(req.params.id);
    if (!data) return res.status(404).json(`job not found`);
    res.status(200).json(data);
});
router.get(`/jobs/hr/:id`, async (req, res) => {
    const data = await Job.find({ user: req.params.id }).sort({ createdAt: -1 });
    res.status(200).json(data);
})
router.get(`/job/applied/:id/:user`, verifyToken, async (req, res) => {
    const data = await Job.findById(req.params.id);
    if (JSON.stringify(data.user) !== JSON.stringify(req.params.user)) {
        return res.status(401).json(`Login to access`);
    }
    const AllUser = await Promise.all(
        data.enrolled.map((item) => {
            return User.findById(item)
        })
    )
    let UserList = [];
    AllUser.map((person) => {
        const { password, following, followers, GSTNumber, ...data } = person._doc;
        UserList.push({ data });
    })
    res.status(200).json(UserList);
})
router.get(`/job/sorted/:id/:user`, verifyToken, async (req, res) => {
    const data = await Job.findById(req.params.id);
    if (JSON.stringify(data.user) !== JSON.stringify(req.params.user)) {
        return res.status(401).json(`Login to access`);
    }
    const AllUser = await Promise.all(
        data.sortlist.map((item) => {
            return User.findById(item)
        })
    )
    let UserList = [];
    AllUser.map((person) => {
        const { password, following, followers, GSTNumber, ...data } = person._doc;
        UserList.push({ data });
    })
    res.status(200).json(UserList);
})
module.exports = router;
