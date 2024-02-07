const express = require("express");
require("./database/config");
const stud = require("./database/collection");
const cors = require("cors");
const bcrypt = require("bcrypt");
const multer = require("multer");
const  jwt = require("jsonwebtoken");
const jwtkey = 'studinfo';
const app = express();

// ===file uploade middlware=========
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "upload");
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname + "-" + Date.now() + ".jpg");
    },
  }),
}).single("image");

// ========middleware jwt token verify=======

function verifytoken(req,res,next){
  let token = req.headers['authorization'];
  if(token){
    token = token.split(' ')[2];
    jwt.verify(token,jwtkey,(error,valid)=>{
      console.log(error);
      if(error){
        res.status(401).send("provied valied  token")
      }else{
        next();
      }
    })
  }else{
    res.status(403).send("authorized forbin");
  }
}


app.use(express.json());
app.use(cors());

// ===insert api=====
app.post("/insert",upload, async (req, res) => {
    const data = new stud({
      fristname: req.body.firstname,
      middlename: req.body.middlename,
      lastname: req.body.lastname,
      email: req.body.email,
      home_no: req.body.h_no,
      soc: req.body.soc,
      near: req.body.near,
      area: req.body.area,
      city: req.body.city,
      distric: req.body.state,
      pincode: req.body.pincode,
      country: req.body.country,
      stream: req.body.stream,
      sem: req.body.sem,
      course: req.body.course,
      image: req.file.originalname  
    });
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    data.password = hashedPassword;
    let result = await data.save();
    jwt.sign({result},jwtkey,{expiresIn:"24h"},(err,token)=>{
      if(err){
        res.send("Something Want To Wrong !");
      }
      res.send({result,auth:token});
    })
});

// =======login api =====

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await stud.findOne({ email });

    if (!user) {
      return res.status(404).send('User does not exist');
    }

    const passMatch = await bcrypt.compare(password, user.password);

      if (passMatch) {
        jwt.sign({user},jwtkey,{expiresIn:"24h"},(err,token)=>{
          if(err){
            res.send("Something Want To Wrong !");
          }
          res.send({user,auth:token});
        })
      } else {
        res.status(401).send('Authentication failed');
      }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(3000);
