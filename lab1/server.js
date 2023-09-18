/*
Name: Justine Yap
Std Number: 101180098
The code below is mostly copied from my COMP2406 assignment 4 code from Fall 2021 by Dave Mckenney
*/
const http = require('http');
const pug = require("pug");
const fs = require("fs");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const Product = require("./models/productModel");


const { ObjectId } = require("bson"); //this is to create an object id for each new product added
const PORT = process.env.PORT || 3000;

const products = require("./products.json");

// Setting middleware
app.set("views");
app.set("view engine", "pug");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join("public", "javascript")));
app.use(express.static(path.join("public", "images")));
app.use(express.static(path.join("public", "css")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


//GET Homepage
app.get(["/", "/home"], (req, res) => res.render("home"));

//Log requests received
app.use(function(req, res, next) {
    console.log(`${req.method} for ${req.url}`);
    if (Object.keys(req.body).length > 0) {
        console.log("Body:");
        console.log(req.body);
    }
    next();
});

// GET add product page
app.get("/register", (req, res) => {
    res.render("register");
});


// Search for products
app.get('/products', async (req, res) => {
    try {
        let result;
        if (!req.query.name) {
            // Send all products that have stock greater than 0
            result = await Product.find({ stock: { $gt: 0 } });
        } else {
            // Get query value
            let name = req.query.name;
            // Send products that match the query value (case-insensitive) and have stock greater than 0
            result = await Product.find({
                name: { $regex: new RegExp(name, "i") },
                stock: { $gt: 0 }
            });
        }

        res.format({
            "application/json": () => {
                res.set("Content-Type", "application/json");
                res.json(result);
            },
            "text/html": () => {
                res.set("Content-Type", "text/html");
                const renderData = !req.query.name
                    ? { title: "All Users", users: result }
                    : { title: `Existing products with: ${req.query.name}`, products: result };
                res.render("products", renderData);
            },
            default: () => {
                res.status(406).send("Not acceptable");
            },
        });
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error");
    }
});


// Create a new product
app.post('/products', (req, res) => {
    const product = {
        id: products.length + 1,  // Simple ID auto-increment logic
        ...req.body
    };
    products.push(product);
    res.json(product);
});

// Retrieve a specific product by ID
app.get('/products/:id', (req, res) => {
    const product = products.find(p => p.id == req.params.id);
    if (!product) {
        return res.status(404).send('Product not found');
    }
    res.json(product);
});

// Add a review for a specific product
app.post('/products/:id/reviews', (req, res) => {
    const { rating } = req.body;
    if (rating < 1 || rating > 10) {
        return res.status(400).send('Rating must be between 1 and 10');
    }
    if (!reviews[req.params.id]) {
        reviews[req.params.id] = [];
    }
    reviews[req.params.id].push({ rating });
    res.json({ rating });
});

// Retrieve reviews for a specific product
app.get('/products/:id/reviews', (req, res) => {
    const productReviews = reviews[req.params.id] || [];
    res.json(productReviews);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});