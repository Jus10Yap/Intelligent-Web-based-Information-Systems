const Crawler = require("crawler");
const url = require("url"); // Make sure to import any required modules at the top.
const Book = require("../../models/bookModel");
const elasticlunr = require("elasticlunr");
const { Matrix } = require("ml-matrix");

//Set to keep track of visited URLs.
const visitedURLs = new Set();
let pageCount = 0;
const MAX_PAGES = 1000;


//CRAWLER
const p = new Crawler({
    maxConnections: 10, // use this for parallel, rateLimit for individual
    callback: async function (error, res, done) {
        if (error) {
            console.log(error);
        } else {
            const currentURL = res.options.uri;
        if (!visitedURLs.has(currentURL) && pageCount < MAX_PAGES) {
            visitedURLs.add(currentURL);
            const $ = res.$;

            const bookTitle = $("h1").text();
            const bookDescription = $('meta[name="description"]').attr('content') || "";
            
            const relativeLinks = $("a[href]").map(function() {
                return url.resolve(res.options.uri, $(this).attr('href'));
            }).get();


            
            const book = new Book({
                url: currentURL,
                title: bookTitle,
                description: bookDescription,
                outgoingLinks: relativeLinks
            });

            await book.save();

            pageCount++;

            // Queue only the book links for further crawling.
            // Assuming that all books have a common URL pattern.
            relativeLinks.forEach(link => {
                if (!visitedURLs.has(link) && pageCount < MAX_PAGES) {
                    p.queue(link);
                }
            });
            } else {
                console.log(`Skipping already visited URL: ${currentURL}`);
            }
        }
        done();
    },
});

async function pageRank() {
    const alpha = 0.1; // Damping factor
    const threshold = 0.0001; // Convergence threshold

    // Fetch all books from the database
    let books = await Book.find();

    const N = books.length; 

    // Initialize a square matrix filled with zeroes
    let M = Array(N)
        .fill()
        .map(() => Array(N).fill(0));

    // Populate transition matrix using outgoing links of each page/url
    books.forEach((book, i) => {
        if (book.outgoingLinks.length) {
            book.outgoingLinks.forEach((outLink) => {
                const j = books.findIndex((b) => b.url === outLink);
                if (j !== -1) {
                    // Set the probability for the link from page i to page j
                    M[j][i] = 1 / book.outgoingLinks.length;
                }
            });
        } else {
            // If a page/url does not have an outgoing link, consider it a dangling node
            for (let j = 0; j < N; j++) {
                M[j][i] = 1 / N;
            }
        }
    });

    // Initialize the PageRank vector
    let x0 = Array(N).fill(1 / N);
    let diff = 1;

    // Compute the PageRank vector until convergence
    while (diff > threshold) {
        const prevMatrix = new Matrix([x0]);

        // Compute the next PageRank vector using the transition matrix
        x0 = M.map((row) => row.reduce((i, val, index) => i + val * x0[index], 0))
             .map((val) => (1 - alpha) * val + alpha / N); 

        const x0Matrix = new Matrix([x0]);

        // Compute the difference between the current and previous PageRank vector
        const diffMatrix = x0Matrix.sub(prevMatrix);

        // Calculate the L2 norm
        diff = diffMatrix.norm();
    }

    const urls = x0.map((value, index) => ({
        url: books[index].url,
        rank: value,
    }));

    const sortedUrls = urls.sort((a, b) => b.rank - a.rank);
    
    for (const { url, rank } of sortedUrls) {
        await Book.updateOne({ url }, { pageRank: rank });
    }

    loggedUrls = sortedUrls.slice(0, 10); // Displaying top 10

    console.log("Top 10 PageRank Values:");
    loggedUrls.forEach((entry, index) => {
        console.log(`#${index + 1}. (${entry.rank.toFixed(10)}) ${entry.url}`);
    });
}




//Triggered when the queue becomes empty
p.on("drain", async function () {
    console.log("Book Crawling completed.");
    try {
  
    //compute and save the PageRank values onto db
    await pageRank();
  
    } catch (error) {
      console.log("Error post-processing the crawled data:", error);
    }
    
    console.log("Done.");
  });
  
module.exports = p; //exports the crawler