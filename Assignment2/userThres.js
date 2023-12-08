console.time("wholeCode");//start timer for code
const fs = require("fs");

const filename = "./testFiles/assignment2-data.txt";
const data = fs.readFileSync(filename, "utf8").split("\n");
//parse data from file
const [numUsers, numItems] = data[0].split(" ").map(Number);
const users = data[1].split(" ");
const items = data[2].split(" ");

const userRatings = data
  .slice(3, 3 + numUsers)
  .map((row) => row.split(" ").map(Number));


const similarityThreshold = 0.3; 
const userThreshold = 5;

const userItemMatrix = userRatings.map((row) => [...row]);
const ratingsMatrix = userItemMatrix;

function pearsonCorrelation(user1, user2) {

    const mean1 =
      user1.reduce((acc, rating) => (rating !== 0 ? acc + rating : acc), 0) /
      user1.filter((rating) => rating !== 0).length;
  
    const mean2 =
      user2.reduce((acc, rating) => (rating !== 0 ? acc + rating : acc), 0) /
      user2.filter((rating) => rating !== 0).length;
  
    //calculate the Pearson correlation coefficient
    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;
  
    for (let i = 0; i < user1.length; i++) {
      if (user1[i] !== 0 && user2[i] !== 0) {
        const dev1 = user1[i] - mean1;
        const dev2 = user2[i] - mean2;
  
        numerator += dev1 * dev2;
        denominator1 += dev1 * dev1;
        denominator2 += dev2 * dev2;
      } else {
        continue;
      }
    }
  
    const denominator = Math.sqrt(denominator1) * Math.sqrt(denominator2);
  
    if (denominator === 0) {
      return 0;
    }
  
    if (isNaN(numerator / denominator)) {
      return 0;
    } else {
      return numerator / denominator;
    }
  }

function findNeighborsAboveThreshold(
  user,
  ratingsMatrix,
  threshold,
  userIndex,
  itemIndex
) {
  const neighbors = [];

  for (
    let otherUserIndex = 0;
    otherUserIndex < numUsers;
    otherUserIndex++
  ) {
    if (
      ratingsMatrix[otherUserIndex].filter((rating) => rating !== 0).length <
      userThreshold
    ) {
      continue;
    }
    const neighborRating = ratingsMatrix[otherUserIndex][itemIndex];

    if (
      neighborRating === 0 ||
      neighborRating < 0 ||
      neighborRating > 5 ||
      otherUserIndex === userIndex
    ) {
      continue; // Skip users with no ratings during prediction or the current user
    }

    const otherUser = ratingsMatrix[otherUserIndex];
    const similarity = pearsonCorrelation(user, otherUser);

    // Check if the similarity exceeds the threshold
    if (similarity > threshold) {
      neighbors.push({ index: otherUserIndex, similarity });
    }
  }

  return neighbors;
}

let totalAbsoluteError = 0;
let totalPredictions = 0;
let totalNeighborsUsed = 0;
let totalNoValidNeighbors = 0;
let totalUnderPredictions = 0;
let totalOverPredictions = 0;

// leave-one-out cross-validation
for (let userIndex = 0; userIndex < numUsers; userIndex++) {
  for (let itemIndex = 0; itemIndex < numItems; itemIndex++) {
    const testRating = ratingsMatrix[userIndex][itemIndex];

    // invalid current rating
    if (testRating <= 0 || testRating > 5 || isNaN(testRating)) {
      continue;
    }

    if (testRating !== 0) {
      totalPredictions++;

      // temporarily remove the test rating for LOOCV
      ratingsMatrix[userIndex][itemIndex] = 0;

      const user = ratingsMatrix[userIndex];

      // find neighbors above the similarity threshold
      const neighbors = findNeighborsAboveThreshold(
        user,
        ratingsMatrix,
        similarityThreshold,
        userIndex,
        itemIndex
      );

      // output information about the prediction per user/item
      // console.log(`Predicting for user: ${users[userIndex]}`);
      // console.log(`Predicting for item: ${items[itemIndex]}`);
      // console.log(`Found ${neighbors.length} valid neighbors:`);

      const userMean = user.reduce(
        (acc, rating) => (rating !== 0 ? acc + rating : acc),
        0
      ) / user.filter((rating) => rating !== 0).length;

      // no valid neighbors
      if (neighbors.length === 0) {
        totalNoValidNeighbors++;
        userItemMatrix[userIndex][itemIndex] = userMean;
      } // valid neighbors are used for prediction
      else {
        let prediction = 0;
        let totalSimilarity = 0;

        for (const neighbor of neighbors) {
          const neighborIndex = neighbor.index;
          const similarity = neighbor.similarity;

          const neighborRating = ratingsMatrix[neighborIndex][itemIndex];
          const neighborMean =
            ratingsMatrix[neighborIndex].reduce(
              (acc, rating) => (rating !== 0 ? acc + rating : acc),
              0
            ) /
            ratingsMatrix[neighborIndex].filter((rating) => rating !== 0).length;

          prediction += similarity * (neighborRating - neighborMean);
          totalSimilarity += parseFloat(similarity); // Use absolute similarity for weighting
        }

        prediction = userMean + prediction / totalSimilarity;

        userItemMatrix[userIndex][itemIndex] = prediction;
        totalNeighborsUsed += neighbors.length;
      }

      // console.log(
      //   `Initial predicted value: ${userItemMatrix[userIndex][itemIndex]}`
      // );

      // Handle extreme cases for prediction
      if (userItemMatrix[userIndex][itemIndex] < 1) {
        totalUnderPredictions++;
        userItemMatrix[userIndex][itemIndex] = 1;
      } else if (userItemMatrix[userIndex][itemIndex] > 5) {
        totalOverPredictions++;
        userItemMatrix[userIndex][itemIndex] = 5;
      }

      // Calculate absolute error
      const absoluteError = Math.abs(
        testRating - userItemMatrix[userIndex][itemIndex]
      );
      totalAbsoluteError += absoluteError;

      // console.log(
      //   `Final predicted value: ${userItemMatrix[userIndex][itemIndex]}`
      // );
      // console.log();

      // Restore the test rating after prediction for the next iteration
      ratingsMatrix[userIndex][itemIndex] = testRating;
    }
  }
}

// final outputs
const meanAbsoluteError = totalAbsoluteError / totalPredictions;
console.log(
  `User-Based, Threshold-based, Pearson Correlation Coefficient, File ${filename}`
);
console.log(`Total predictions: ${totalPredictions}`);
console.log(`Total under predictions (<1): ${totalUnderPredictions}`);
console.log(`Total over predictions (>5): ${totalOverPredictions}`);
console.log(
  `Number of cases with no valid neighbors: ${totalNoValidNeighbors}`
);
console.log(`Average neighbors used: ${totalNeighborsUsed / totalPredictions}`);
console.log(`LOOCV MAE = ${meanAbsoluteError}`);

console.timeEnd("wholeCode");
