// Start measuring the execution time
console.time("wholeCode");

// Required module for file system operations
const fs = require("fs");

// Define the filename and read data from the file
const filename = "./testFiles/assignment2-data.txt";
const data = fs.readFileSync(filename, "utf8").split("\n");
const [numUsers, numItems] = data[0].split(" ").map(Number);

// Display the filename
console.log(`Filename: ${filename}`);

// Extract user ratings data from the file
const userRatings = data.slice(3, 3 + numUsers).map((row) => row.split(" ").map(Number));

// Set similarity and item thresholds
const similarityThreshold = 0.6;
const itemThreshold = 50;

// Create matrices for user-item ratings
const userItemMatrix = userRatings.map((row) => [...row]);
const ratingsMatrix = userRatings.map((row) => [...row]);

// Caches to store computed values for optimization
const similarityCache = new Map();
const userMeanRatingCache = new Map();

// Function to find common ratings between two items
function findCommonRatings(item1, item2) {
  // Implementation details
}

// Function to get the mean rating of a user
function getUserMeanRating(userIndex, ratingsMatrix) {
  // Implementation details
}

// Function to calculate adjusted cosine similarity between two items
function adjustedCosineSimilarity(item1, item2, ratings, commonRatings) {
  // Implementation details
}

// Function to find neighbors above a similarity threshold for a given item
function findNeighborsAboveThreshold(item, ratingsMatrix, threshold, userIndex, itemIndex) {
  // Implementation details
}

// Variables to track prediction metrics
let totalAbsoluteError = 0;
let totalPredictions = 0;
let totalNeighborsUsed = 0;
let totalNoValidNeighbors = 0;
let totalUnderPredictions = 0;
let totalOverPredictions = 0;

// Nested loops for user-item predictions
for (let userIndex = 0; userIndex < numUsers; userIndex++) {
  for (let itemIndex = 0; itemIndex < numItems; itemIndex++) {
    // Extract the test rating for evaluation
    const testRating = ratingsMatrix[userIndex][itemIndex];

    // Skip invalid or already predicted ratings
    if (testRating <= 0 || testRating > 5 || isNaN(testRating)) {
      continue;
    }

    // Increment the total number of predictions
    totalPredictions++;

    // Temporarily remove the test rating for Leave-One-Out Cross-Validation (LOOCV)
    ratingsMatrix[userIndex][itemIndex] = 0;

    // Extract item ratings for the current item
    const item = ratingsMatrix.map((row) => row[itemIndex]);

    // Find neighbors above the similarity threshold
    const neighbors = findNeighborsAboveThreshold(item, ratingsMatrix, similarityThreshold, userIndex, itemIndex);

    // Handle cases where no valid neighbors are found
    if (neighbors.length === 0) {
      totalNoValidNeighbors++;
      // Use mean user rating as a fallback
      const userMeanRating = getUserMeanRating(userIndex, ratingsMatrix);
      userItemMatrix[userIndex][itemIndex] = userMeanRating;
    } else {
      // Inside the loop where the prediction is calculated
      let prediction = 0;
      let totalSimilarity = 0;

      // Loop through neighbors to aggregate predictions
      for (const neighbor of neighbors) {
        const neighborIndex = neighbor.index;
        const similarity = neighbor.similarity;
        const neighborRating = ratingsMatrix[userIndex][neighborIndex];

        // Consider the direction of similarity when aggregating
        prediction += similarity * neighborRating;
        totalSimilarity += Math.abs(similarity); // Use absolute similarity for weighting
      }

      // Finalize the prediction
      prediction /= totalSimilarity;
      userItemMatrix[userIndex][itemIndex] = prediction;

      // Update the total number of neighbors used
      totalNeighborsUsed += neighbors.length;
    }

    // Handle extreme cases for the fallback prediction
    if (userItemMatrix[userIndex][itemIndex] < 1) {
      totalUnderPredictions++;
      userItemMatrix[userIndex][itemIndex] = 1;
    } else if (userItemMatrix[userIndex][itemIndex] > 5) {
      totalOverPredictions++;
      userItemMatrix[userIndex][itemIndex] = 5;
    }

    // Calculate absolute error for evaluation
    const absoluteError = Math.abs(testRating - userItemMatrix[userIndex][itemIndex]);
    totalAbsoluteError += absoluteError;

    // Restore the test rating after prediction for the next iteration
    ratingsMatrix[userIndex][itemIndex] = testRating;
  }
}

// Calculate mean absolute error and display prediction metrics
const meanAbsoluteError = totalAbsoluteError / totalPredictions;
console.log(`Item-Based, Negatives Included, Threshold-based, Ignore Negatives, LOOCV MAE = ${meanAbsoluteError}`);
console.log(`Total predictions: ${totalPredictions}`);
console.log(`Total under predictions (<1): ${totalUnderPredictions}`);
console.log(`Total over predictions (>5): ${totalOverPredictions}`);
console.log(`Number of cases with no valid neighbors: ${totalNoValidNeighbors}`);
console.log(`Average neighbors used: ${totalNeighborsUsed / totalPredictions}`);

// End measuring the execution time
console.timeEnd("wholeCode");
