import 'dotenv/config';
import mongoose from 'mongoose';

let isConnected = false;
const mongo_url = process.env.ATLAS_DBURL 

export default async function dbConnect() {
  if (isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(mongo_url);

    isConnected = db.connections[0].readyState;
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw new Error("MongoDB connection failed");
  }
}