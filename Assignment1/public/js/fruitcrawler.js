const Crawler = require("crawler");
const url = require("url"); // Make sure to import any required modules at the top.
const Fruit = require("../../models/fruitModel");
const elasticlunr = require("elasticlunr");
const { Matrix } = require("ml-matrix");

//Set to keep track of visited URLs.
const visitedURLs = new Set();
const urls = [];


//CRAWLER
const c = new Crawler({
  maxConnections: 10, //use this for parallel, rateLimit for individual
  //rateLimit: 1000,

  // This will be called for each crawled fruit
  callback: async function (error, res, done) {
    if (error) {
      console.log(error);
    } else {
      let currentURL = res.options.uri;
      if (!visitedURLs.has(currentURL)) {
        visitedURLs.add(currentURL);
        urls.push(currentURL);
        let $ = res.$; //get cheerio data
        let links = $("a"); //get all links from fruit

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

        const fruitTitle = $("title").text();
        const fruitContent = $("body").text();

        const fruit = new Fruit({
          url: currentURL,
          content: $("body").html(),
          outgoingLinks: outgoing,
        });
        await fruit.save();

      } else {
        console.log(`Skipping already visited URL: ${currentURL}`);
      }
    }
    done();
  },
});

async function calculateAndSaveIncomingLinks() {
  // Fetch all fruits from the database
  const fruits = await Fruit.find();

  // For each fruit, populate its incoming links
  for (let currentfruit of fruits) {
    const incomingLinks = [];

    // Loop through all fruits to see which ones link to the current fruit
    for (let fruit of fruits) {
      if (fruit.outgoingLinks.includes(currentfruit.url)) {
        incomingLinks.push(fruit.url);
      }
    }

    // Update the current fruit's incomingLinks field in the database
    currentfruit.incomingLinks = incomingLinks;
    await currentfruit.save();
  }

  console.log("Updated all fruits with incoming link URLs.");
}

async function pageRank() {
  const alpha = 0.1; // Damping factor
  const threshold = 0.0001; // Convergence threshold

  //getting all fruits from the database
  let fruits = await Fruit.find();

  //sort the fruits based on their urls "N-X.html"
  fruits = fruits.sort((a, b) => {
    const aNum = parseInt(a.url.split("/").pop().split("-")[1]);
    const bNum = parseInt(b.url.split("/").pop().split("-")[1]);
    return aNum - bNum;
  });

  const N = fruits.length; //1000
  //1000 x 1000 matrix filled with zeroes
  let M = Array(N)
    .fill()
    .map(() => Array(N).fill(0));

  //populate transition matrix using outgoing links of each page/url
  fruits.forEach((fruit, i) => {
    if (fruit.outgoingLinks.length) {
      fruit.outgoingLinks.forEach((outLink) => {
        const j = fruits.findIndex((p) => p.url === outLink);
        if (j !== -1) {
          // Set the probability for the link from page i to page j
          M[j][i] = 1 / fruit.outgoingLinks.length;
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
    url: fruits[index].url,
    rank: value,
  }));
  
  const sortedUrls = urls.sort((a, b) => b.rank - a.rank);
  for (const { url, rank } of sortedUrls) {
    await Fruit.updateOne({ url }, { pageRank: rank });
  }

  loggedUrls = sortedUrls.slice(0, 10);

  console.log("Top 10 PageRank Values:");
  loggedUrls.forEach((entry, index) => {
    console.log(`#${index + 1}. (${entry.rank.toFixed(10)}) ${entry.url}`);
  });
}




//Triggered when the queue becomes empty
c.on("drain", async function () {
  console.log("Fruits Crawling completed.");
  try {
    //update the incoming links of all fruits
    await calculateAndSaveIncomingLinks();
    
    //compute and save the PageRank values onto db
    await pageRank();
  } catch (error) {
    console.log("Error post-processing the crawled data:", error);
  }
  
  console.log("Done.");
});

//export crawler and index
module.exports = {
  crawler: c
};
