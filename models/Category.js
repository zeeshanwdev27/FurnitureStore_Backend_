import mongoose from "mongoose";
const schema = mongoose.Schema;

const categorySchema = new schema({
  name: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Category = mongoose.model("Category", categorySchema);

export default Category;