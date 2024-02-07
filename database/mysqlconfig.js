const mysql =  require('mysql');
const con = mysql.createConnection({
    host:"localhost",
    user:"root",
    passwrod:"",
    database:"e-comm"
});

con.connect((err)=>{
    if(err){
        console.log("Error");
    }else{
        console.log("database connected");
    }
});

module.exports = con;