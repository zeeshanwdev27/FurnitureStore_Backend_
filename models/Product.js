import mongoose from "mongoose";
const schema = mongoose.Schema


const productSchema = new schema({
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    image: {
      url: String,
      filename: String
    },
      category: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    }
  });


const Product = mongoose.model("Product", productSchema)


export default Product