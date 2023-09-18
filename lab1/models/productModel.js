const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true // Removes leading/trailing white spaces
    },
    price: {
        type: Number,
        required: true,
        min: 0 // Ensures price is non-negative
    },
    dimensions: {
        x: {
            type: Number,
            required: true,
            min: 0 // Ensures positive values
        },
        y: {
            type: Number,
            required: true,
            min: 0 // Ensures positive values
        },
        z: {
            type: Number,
            required: true,
            min: 0 // Ensures positive values
        }
    },
    stock: {
        type: Number,
        required: true,
        min: 0 // Ensures stock is non-negative
    }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
