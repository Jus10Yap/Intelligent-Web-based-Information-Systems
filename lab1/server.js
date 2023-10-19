/*
Name: Justine Yap
Std Number: 101180098
The code below is mostly copied from my COMP2406 assignment 4 code from Fall 2021 by Dave Mckenney
*/

//modules
const http = require("http");
const pug = require("pug");
const fs = require("fs");
const url = require("url");
const path = require("path");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const mongoose = require("mongoose");
const Crawler = require("crawler");
const elasticlunr = require("elasticlunr");
const { Matrix } = require("ml-matrix");

const Product = require("./models/productModel");
const Order = require("./models/orderModel");
const Page = require("./models/pageModel");

// Setting middleware
app.set("views");
app.set("view engine", "pug");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join("public", "javascript")));
app.use(express.static(path.join("public", "images")));
app.use(express.static(path.join("public", "css")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//Log requests received
app.use(function (req, res, next) {
  console.log(`${req.method} for ${req.url}`);
  if (Object.keys(req.body).length > 0) {
    console.log("Body:");
    console.log(req.body);
  }
  next();
});

//Set to keep track of visited URLs.
const visitedURLs = new Set();
const urls = [];

//Create your index
//Specify fields you want to include in search
//Specify reference you want back (i.e., page ID)
const index = elasticlunr(function () {
  this.addField("title");
  this.addField("body");
  this.setRef("id");
});

//CRAWLER
const c = new Crawler({
  maxConnections: 10, //use this for parallel, rateLimit for individual
  //rateLimit: 1000,

  // This will be called for each crawled page
  callback: async function (error, res, done) {
    if (error) {
      console.log(error);
    } else {
      let currentURL = res.options.uri;
      if (!visitedURLs.has(currentURL)) {
        visitedURLs.add(currentURL);
        urls.push(currentURL);
        let $ = res.$; //get cheerio data, see cheerio docs for info
        let links = $("a"); //get all links from page

        const outgoing = [];

        $(links).each(async function (i, link) {
          //Log out links
          //In real crawler, do processing, decide if they need to be added to queue
          const href = $(link).attr("href");
          if (href) {
            outgoing.push(url.resolve(res.options.uri, href));

            // If not present in database, queue it up for crawling
            c.queue(url.resolve(res.options.uri, href));

            console.log($(link).text() + ":  " + href);

            //url formatter
            //res.options.uri = https://people.scs.carleton.ca/~davidmckenney/fruitgraph/
            //href = N-XXX.html
          }
        });

        const pageTitle = $("title").text();
        const pageContent = $("body").text();

        const page = new Page({
          url: currentURL,
          content: $("body").html(),
          outgoingLinks: outgoing,
        });
        await page.save();

        // Add page to search index
        index.addDoc({
          id: page._id, // Use the string representation of the ObjectID
          title: pageTitle,
          body: pageContent,
        });
      } else {
        console.log(`Skipping already visited URL: ${currentURL}`);
      }
    }
    done();
  },
});

async function calculateAndSaveIncomingLinks() {
  // Fetch all pages from the database
  const pages = await Page.find();

  // For each page, populate its incoming links
  for (let currentPage of pages) {
    const incomingLinks = [];

    // Loop through all pages to see which ones link to the current page
    for (let page of pages) {
      if (page.outgoingLinks.includes(currentPage.url)) {
        incomingLinks.push(page.url);
      }
    }

    // Update the current page's incomingLinks field in the database
    currentPage.incomingLinks = incomingLinks;
    await currentPage.save();
  }

  console.log("Updated all pages with incoming link URLs.");
}

app.get("/popular", async (req, res) => {
  try {
    const result = await Page.aggregate([
      { $unwind: "$outgoingLinks" }, //deconstructing all the outgoingLinks arrays in the db
      { $group: { _id: "$outgoingLinks", count: { $sum: 1 } } }, //group outgoingLinks and count how many times this url is referenced
      { $sort: { count: -1 } }, //sort by descending order
      { $limit: 10 }, //10 pages only
    ]);

    res.json(
      result.map((item) => ({
        url: item._id,
      }))
    );
  } catch (err) {
    res.status(500).send("Internal server error");
  }
});

app.get("/page/:url", async (req, res) => {
  try {
    const partialUrl = req.params.url.slice(1);
    const fullUrl = `https://people.scs.carleton.ca/~davidmckenney/fruitgraph/${partialUrl}`;

    // Find the page in the database based on the full URL
    const page = await Page.findOne({ url: fullUrl });

    if (!page) {
      return res.status(404).send("Page not found");
    }

    // Aggregate incoming links for the requested page
    const incomingLinks = await Page.aggregate([
      { $unwind: "$outgoingLinks" },
      { $match: { outgoingLinks: fullUrl } }, // Match links that point to the requested page
      { $group: { _id: "$url" } }, // Group by the source page's URL
    ]);

    res.json({
      url: page.url,
      incomingLinks: incomingLinks.map((item) => item._id),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});



async function pageRank() {
  const alpha = 0.1; // Damping factor
  const threshold = 0.0001; // Convergence threshold

  //getting all pages from the database
  let pages = await Page.find();

  //sort the pages based on their urls "N-X.html"
  pages = pages.sort((a, b) => {
    const aNum = parseInt(a.url.split("/").pop().split("-")[1]);
    const bNum = parseInt(b.url.split("/").pop().split("-")[1]);
    return aNum - bNum;
  });

  const N = pages.length; //1000
  //1000 x 1000 matrix filled with zeroes
  let M = Array(N)
    .fill()
    .map(() => Array(N).fill(0));

  //populate transition matrix using outgoing links of each page/url
  pages.forEach((page, i) => {
    if (page.outgoingLinks.length) {
      page.outgoingLinks.forEach((outLink) => {
        const j = pages.findIndex((p) => p.url === outLink);
        if (j !== -1) {
          // Set the probability for the link from page i to page j
          M[j][i] = 1 / page.outgoingLinks.length;
        }
      });
    } else {
      //if a page/url does not have an outgoing link
      for (let j = 0; j < N; j++) {
        M[j][i] = 1 / N;
      }
    }
  });
  // Initialize the PageRank
  let x0 = Array(N).fill(1 / N);
  let diff = 1;

  // compute the PageRank vector until convergence
  while (diff > threshold) {
    const prevMatrix = new Matrix([x0]); // Convert to matrix object

    // Compute the next PageRank vector using the transition matrix
    x0 = M.map((row) =>
      row.reduce((i, val, index) => i + val * x0[index], 0)
    ).map((val) => (1 - alpha) * val + alpha / N); //multiply the resulting matrix by (1- 𝝰) then Add 𝝰/N to each entry of the resulting matrix

    const x0Matrix = new Matrix([x0]);

    // Compute the difference matrix
    const diffMatrix = x0Matrix.sub(prevMatrix);

    // Calculate the L2 norm
    diff = diffMatrix.norm();
  }

  const urls = x0.map((value, index) => ({
    url: pages[index].url,
    rank: value,
  }));

  const sortedUrls = urls.sort((a, b) => b.rank - a.rank).slice(0, 25);

  console.log("PageRank Values:");
  sortedUrls.forEach((entry, index) => {
    console.log(`#${index + 1}. (${entry.rank.toFixed(10)}) ${entry.url}`);
  });
}

//Perhaps a useful event
//Triggered when the queue becomes empty
//There are some other events, check crawler docs
c.on("drain", function () {
  console.log("Done.");
  calculateAndSaveIncomingLinks().catch((error) => {
    console.error("Error updating the database:", error);
  });
});

//Queue a URL, which starts the crawl
//c.queue("https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html");

pageRank().catch((error) => {
  console.log("Error computing PageRank:", error);
});



app.get("/search", async (req, res) => {
  try {
    let webpageResults = [];
    if (req.query.q) {
      console.log(req.query.q);
      const results = index.search(req.query.q, { expand: true }).slice(0, 10);
      console.log(results);
      // Fetch data for each result using reference ID
      for (const result of results) {
        const page = await Page.findById(result.ref);
        if (page) {
          let title = page.url.split("/").pop().replace(".html", "");
          webpageResults.push({
            id: result.ref,
            url: page.url,
            title: title,
            score: result.score,
          });
        }
      }
    }
    res.render("search", { webpageResults: webpageResults });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
});

const getReviews = async (req, res) => {
  try {
    let result = [];

    // If there are no query parameters provided in the request.
    if (!Object.keys(req.query).length) {
      console.log("Returning all products with reviews");

      // Fetch all products from the database that have at least one review.
      // The condition checks if the first review (index 0) exists.
      result = await Product.find({ "reviews.0": { $exists: true } });
    }

    console.log("Result: \n", result);

    res.format({
      "application/json": () => {
        res.set("Content-Type", "application/json");
        res.json(result);
      },
      "text/html": () => {
        res.set("Content-Type", "text/html");
        const renderData = { products: result };
        res.render("reviews", renderData);
      },
      default: () => {
        res.status(406).send("Not acceptable");
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
};

const getProducts = async (req, res) => {
  try {
    let result = [];

    // Check if the 'name' query parameter is provided.
    // Convert it to lowercase and remove any leading/trailing whitespace.
    const nameQuery = req.query.name
      ? req.query.name.toLowerCase().trim()
      : null;

    const filters = {};

    // If there's a 'name' query, add it to the filters with a case-insensitive regex.
    if (nameQuery) {
      filters.name = { $regex: new RegExp(nameQuery, "i") };
    }

    // If the 'instock' query parameter is set to "1", filter products that have stock greater than 0.
    if (req.query.instock == "1") {
      filters.stock = { $gt: 0 };
    }

    // Fetch products based on the filters.
    result = await Product.find(filters);

    // Log the retrieved products.
    console.log("Result: \n", result);

    res.format({
      "application/json": () => {
        res.set("Content-Type", "application/json");
        res.json(result);
      },
      "text/html": () => {
        res.set("Content-Type", "text/html");
        const renderData = !nameQuery
          ? { title: "All Products", products: result }
          : { title: `Products matching: ${nameQuery}`, products: result };
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
};

const getProduct = async (req, res) => {
  try {
    // Fetch the product by its ID from the request parameters.
    // The '.slice(1)' removes the preceding slash in the ID from the route.
    const product = await Product.findById(req.params.id.slice(1));

    // If the product is not found in the database.
    if (!product) {
      console.log(`Product with ID ${req.params.id.slice(1)} not found.`); // Log for debugging.
      return res.status(404).send("Product not found");
    }

    // Determine the response format based on the client's request header.
    res.format({
      // If client expects JSON.
      "application/json": () => {
        res.set("Content-Type", "application/json");
        res.json(product); // Send product data as JSON.
      },

      // If client expects HTML.
      "text/html": () => {
        res.set("Content-Type", "text/html");

        // Render the product using a template (e.g., PUG) and pass the product data.
        const renderData = { product };
        res.render("product", renderData);
      },

      // Default response if none of the above match the client's expectations.
      default: () => {
        res.status(406).send("Not acceptable");
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
};

const getOrderForm = async (req, res) => {
  try {
    // Fetch all products from the database.
    const products = await Product.find();

    res.format({
      // For clients expecting JSON.
      "application/json": () => {
        res.set("Content-Type", "application/json");
        res.json(products); // Send products data as JSON.
      },

      // For clients expecting HTML.
      "text/html": () => {
        res.set("Content-Type", "text/html");

        // Render the PUG (or any other template engine) file for the order form,
        // passing the fetched products as data to be used in the form.
        res.render("orderForm", { products });
      },
      // Default response if the client's expected format isn't covered above.
      default: () => {
        res.status(406).send("Not acceptable");
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal server error");
  }
};

const getOrders = async (req, res) => {
  try {
    // Fetch all the orders from the database.
    // Also, populate the associated product details for each item in the orders.
    const orders = await Order.find().populate("items.product");

    res.format({
      // For clients expecting JSON.
      "application/json": () => {
        res.set("Content-Type", "application/json");
        res.json(orders); // Send orders data as JSON.
      },

      // For clients expecting HTML.
      "text/html": () => {
        res.set("Content-Type", "text/html");

        // Render the PUG file for displaying all orders
        res.render("orders", { orders: orders });
      },

      default: () => {
        res.status(406).send("Not acceptable");
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
};

const getOrder = async (req, res) => {
  try {
    // Fetch the order by ID from the request parameters.
    // The '.slice(1)' is used to remove the preceding slash in the id from the route.
    // Also populating the associated product details for each item in the order.
    const order = await Order.findById(req.params.id.slice(1)).populate(
      "items.product"
    );

    // If the order is not found in the database.
    if (!order) {
      return res.status(404).send("Order not found");
    }
    res.format({
      // If client expects JSON.
      "application/json": () => {
        res.set("Content-Type", "application/json");
        res.json(order); // Send order data as JSON.
      },

      // If client expects HTML.
      "text/html": () => {
        res.set("Content-Type", "text/html");

        // Render the specific PUG file for order details and pass the fetched order as data.
        res.render("order", { order: order });
      },

      default: () => {
        res.status(406).send("Not acceptable");
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
};

//Post Functions

const createOrder = async (req, res) => {
  try {
    const { customerName, items } = req.body;

    // checking for customerName if empty/not inputted
    if (!customerName || customerName.trim() === "") {
      return res
        .status(400)
        .json({ error: "Customer name is required and cannot be empty." });
    }

    // checking for items if empty/not inputted
    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one product is required in the order." });
    }

    // checking that each product has a valid ID, exists in the database, has enough stock, and the ordered quantity is valid
    for (const item of items) {
      if (!item.product) {
        return res
          .status(400)
          .json({ error: "A valid product ID is required." });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res
          .status(409)
          .json({ error: `Product with ID ${item.product} not found.` });
      }

      if (product.stock < item.quantity) {
        return res
          .status(409)
          .json({ error: `Not enough stock for product ${product.name}.` });
      }

      if (item.quantity < 1) {
        return res.status(400).json({
          error: `Quantity for product ${product.name} cannot be less than 1.`,
        });
      }
    }

    // Reduce the stock quantities of each product
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    // Create the order
    const order = new Order({ customerName, items });
    await order.save();

    res.status(201).json(order);
  } catch (error) {
    console.error("Error while processing order: ", error);
    res.status(500).send("Internal Server Error");
  }
};

// Create a new product
const createProduct = async (req, res) => {
  // Validation
  if (!req.body.name || req.body.name.trim() === "") {
    return res.status(400).send("Name is required and cannot be empty.");
  }

  const price = parseFloat(req.body.price);
  if (isNaN(price) || price < 0) {
    return res.status(400).send("Price should be a valid positive number.");
  }

  const x = parseFloat(req.body["dimensions"]["x"]);
  const y = parseFloat(req.body["dimensions"]["y"]);
  const z = parseFloat(req.body["dimensions"]["z"]);

  if (isNaN(x) || x <= 0 || isNaN(y) || y <= 0 || isNaN(z) || z <= 0) {
    return res.status(400).send("Dimensions should be valid positive numbers.");
  }

  const stock = parseInt(req.body.stock, 10);
  if (isNaN(stock) || stock < 0) {
    return res
      .status(400)
      .send("Stock should be a valid non-negative integer.");
  }

  // Construct the product using the Product model
  const product = new Product({
    name: req.body.name,
    price: price,
    dimensions: { x: x, y: y, z: z },
    stock: stock,
  });

  try {
    // Save the product into MongoDB
    await product.save();

    console.log("Successfully added product: ", product);
    res.redirect("/");
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
};

// Add a review for a specific product
const createReview = async (req, res) => {
  // Validation of rating
  const rating = parseInt(req.body.rating, 10);
  if (isNaN(rating) || rating < 1 || rating > 10) {
    return res.status(400).send("Rating must be between 1 and 10");
  }

  try {
    // Find the product by its ID
    const product = await Product.findById(req.params.id.slice(1));

    // If the product doesn't exist, return a 404 error
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Push the new rating to the product's reviews array
    product.reviews.push(rating);

    // Save the updated product back to the database
    await product.save();

    console.log(`Added review to product ${req.params.id.slice(1)}: `, rating);

    // Redirect (or respond) as needed after adding the review
    res.redirect(`/products/${req.params.id}`);
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
};

// Get Handlers

// GET Homepage: Renders the home page.
app.get(["/", "/home"], (req, res) => res.render("home"));

// GET add product page: Renders the registration page for new products.
app.get("/register", (req, res) => {
  res.render("register");
});

// GET product reviews: Fetches reviews of products.
app.get("/reviews", getReviews);

// GET products list: Fetches the list of all products.
app.get("/products", getProducts);

// GET single product: Fetches details of a specific product based on its ID.
app.get("/products/:id", getProduct);

// GET order form page: Renders the page to place a new order.
app.get("/order-form", getOrderForm);

// GET orders list: Fetches the list of all placed orders.
app.get("/orders", getOrders);

// GET single order: Fetches details of a specific order based on its ID.
app.get("/orders/:id", getOrder);

//Post Handlers

// POST a new review for a specific product based on its ID.
app.post("/products/:id/reviews", createReview);

// POST a new product to the database.
app.post("/products", createProduct);

// POST a new order to the database.
app.post("/orders", createOrder);

//Start the connection to the database
mongoose.connect("mongodb://127.0.0.1:27017/productsDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//Get the default Mongoose connection (can then be shared across multiple files)
let db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  // Confirmation of successful connection to the database.
  console.log("Connected to productsDB database.");
  // Starting the Express server.
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});
