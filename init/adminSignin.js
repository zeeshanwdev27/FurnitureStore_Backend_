import mongoose from "mongoose";
import User from "../models/User.js"



const mongo_url = ""
dbConnect()  
.then(() => console.log("Database is Connected"))
.catch((err) => console.log(err));

async function dbConnect (){
    await mongoose.connect(mongo_url)
}

const adminData = async()=>{
    let admin = await User.insertOne({
        email:"admin123@gmail.com",
        username: "admin123",
        password:"admin123",
        role:"Admin",
    })
    .then(()=>console.log("User Admin Created"))
    .catch((err)=>console.log("Error in Inserting Data into DB",err))
}

adminData()