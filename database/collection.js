const mongoose = require("mongoose");

const stud_schema = new mongoose.Schema({
  fristname: String,
  middlename: String,
  lastname: String,
  email: String,
  home_no: Number,
  soc: String,
  near: String,
  area: String,
  city: String,
  distric: String,
  pincode: Number,
  country: String,
  stream: String,
  sem: Number,
  course: String,
  password:String,
  image:String
});

module.exports = mongoose.model('stud_registration',stud_schema);
