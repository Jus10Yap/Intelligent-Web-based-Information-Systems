const mongoose = require("mongoose");
const Product = require("./models/productModel"); 
const products = require("./products.json");

const modifiedProducts = products.map(product => {
    // Remove the id field
    delete product.id;  // if the field is named 'id' instead of '_id'

    // Add an empty reviews array
    product.reviews = [];

    return product;
});

mongoose.connect('mongodb://127.0.0.1:27017/productsDB', { useNewUrlParser: true, useUnifiedTopology: true });

//Get the default Mongoose connection (can then be shared across multiple files)
let db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

//Once connected, create a document for each product
db.once('open', async function() {
  let countInserted = 0;
  
  for (const product of modifiedProducts) {
    let p = new Product(product);
    
    try {
      await p.save();
      countInserted++;
      console.log("Inserted #" + countInserted);
    } catch(err) {
      console.log("Error saving product:");
      console.log(err.message);
    }
  }
  mongoose.connection.close();
  
});
