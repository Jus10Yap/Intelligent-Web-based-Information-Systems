Justine Yap
101180098

Installation & Usage
    Prerequisites: Node.js, npm, and MongoDB installed
    Installation:  run `npm install` in your terminal to install the required dependencies.
    Database Setup: Make sure the MongoDB server is running
    Start the server: Run 'npm run start' to start the server
    Access the Application: Open a browser and navigate to http://localhost:3000.

Route Endpoints
    GET /popular: Fetch popular pages based on outgoing links.
    GET /page/:url: Fetch details about a specific page.
    GET /search: Search for pages based on content.
    GET /reviews: Fetch products with reviews.
    GET /products and GET /products/:id: Fetch all products or a specific product.
    GET /order-form: View the order form page.
    GET /orders and GET /orders/:id: Fetch all orders or a specific order.
    POST /products/:id/reviews: Post a review for a specific product.
    POST /products: Create a new product.
    POST /orders: Create a new order.

To test for Lab 5 section:
    - assuming that crawler started queue at "https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html" and is crawled data is saved and updated
    - comment out the crawler queue and call page rank function (with try and catch)

Lab Reflection Questions
1. How did you generate the adjacency matrix from the crawled data?
    - initialized a N x N matrix M filled with zeros, where N is the total number of pages fetched from the database.
    - iterated over each page and its outgoing links:
        - If a page had outgoing links, get the index of each link in the pages list. For each identified link (represented by index j), set the value of M[j][i] to 1 divided by the total number of outgoing links of the page (i). This ensures that the probability is evenly distributed among all outgoing links.
        - else if a page did not have any outgoing links, set each value in the corresponding column of M to 1/N.

    This approach ensures that the transition probabilities (values in M) represent the structure of the web graph.

2. What effect would lower/higher alpha values have on the results?
    The alpha value in the PageRank algorithm represents the probability that a user will continue to click on links (and not jump to a random page)

    Higher alpha values (closer to 1):
        - More emphasis is placed on the actual structure of the web graph.
        - The PageRank results are predominantly influenced by the link structure and less by the teleportation (or random jump) factor.

    Lower alpha values (closer to 0):
        - The teleportation (random jump) factor becomes more dominant. This means that the inherent structure of the web graph has less influence on the results, and the PageRank values trend more towards a uniform distribution.
        - It can help tone down issues like rank sinks and rank leaks by ensuring a fair redistribution of rank, but it may also dilute the importance of genuine link structures in the web graph.