const router = require('express').Router();
const User = require("../model/userModal");
const Job = require("../model/jobModal");
const { joinPaths } = require('@remix-run/router');
router.get(`/people`,async(req,res)=>{
    try {
        const page = parseInt(req.query.page) -1 || 0;
        const limit = parseInt(req.query.limit)||5;
        let search = req.query.search||"";
        // let sort = parseInt(req.query.sort)||"";
        let country = req.query.country ||"All";
        const countryOptions = [
            "India",
            "Ind",
            "USA",
            "Japan"
        ]
        country ==="All"?(country = [...countryOptions]):(country = req.query.country.split(","));
        const user = await User.find({name:{$regex:search,$options:"i"}})
        .where("country")
        .in([...country])

        // const searching = {title:{$regex:search,$options:"i"},description:{$regex:search,$options:"i"}};
        const job = await Job.find({
        $or:[
            {
                title:{$regex:search,$options:"i"},
                visible:true
            },
            {
                description:{$regex:search,$options:"i"},
                visible:true
            }
        ]     
       })
        .where("country")
        .in([...country])

        const job1 = await Job.find({description:{$regex:search,$options:"i"},visible:true})
        .where("country")
        .in([...country])
        const total = await User.countDocuments({
            country:{$in:[...country]},
            name:{$regex:search,$options:"i"},
        });

        const totalJobs = await Job.countDocuments({
            country:{$in:[...country]},
            title:{$regex:search,$options:"i"},visible:true
        })
    const response = {
        error:false,
        page,
        limit,
        totalJobs,
        total,
        country:countryOptions,
        user,
        job,
    };

    res.status(200).json(response);
    } catch (error) {
        console.log(error);
        res.status(500).json({error:true,message:"Internal server Error"});
    }
})

router.get(`/featured`,async(req,res)=>{
    const data = req.cookies('pokemon');
    data.map((i)=>{
        
    })
    const jobs = await Job.find({
        $or:[
            {
                title:{$regex:data,$options:"i"},
                visible:true
            },
            {
                description:{$regex:data,$options:"i"},
                visible:true
            },
            {
                country:{$regex:data,$option:"i"},
                visible:true
            }
        ]     
    })
})


router.get('/interest', (req, res) => {
    const interest = req.cookies.pokemon ? JSON.parse(req.cookies.pokemon) : [];
    res.json({ interest });
  });
module.exports = router;