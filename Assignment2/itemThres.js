console.time("wholeCode");//start timer 
const fs = require("fs");
//read and parse data
const filename = "./testFiles/assignment2-data.txt";
const data = fs.readFileSync(filename, "utf8").split("\n");
const [numUsers, numItems] = data[0].split(" ").map(Number);

console.log(`Filename: ${filename}`);

// Extract user ratings data from the file
const userRatings = data
  .slice(3, 3 + numUsers)
  .map((row) => row.split(" ").map(Number));

//parameters that can be manipulated
const similarityThreshold = 0.3;
const itemThreshold = 5;

//matrix of ratings
const userItemMatrix = userRatings.map((row) => [...row]);//manipulated for predictions
const ratingsMatrix = userRatings.map((row) => [...row]);//referenced for predictions/calculations

//caches to improve runtime
const similarityCache = new Map();
const userMeanRatingCache = new Map();

//return the index of users that have a common rating for item1 and item2
function findCommonRatings(item1, item2) {
  const commonRatings = new Set(
    item1.map((rating, index) =>
      rating !== 0 && item2[index] !== 0 ? index : undefined
    ).filter((index) => index !== undefined)
  );
  return commonRatings;
}

//return the mean of the user
function getUserMeanRating(userIndex, ratingsMatrix) {
  if (userMeanRatingCache.has(userIndex)) {
    return userMeanRatingCache.get(userIndex);
  }

  const userRatings = ratingsMatrix[userIndex].filter((rating) => rating !== 0);
  const meanRating =
    (userRatings.reduce((sum, rating) => sum + rating, 0) /
      userRatings.length) ||
    0;

  userMeanRatingCache.set(userIndex, meanRating);
  return meanRating;
}

//calculate the adjusted cosine similarity
function adjustedCosineSimilarity(item1, item2, ratings, commonRatings) {
  const key = `${item1.join(",")}_${item2.join(",")}`;

  //check if similarity is in the cache
  if (similarityCache.has(key)) {
    return similarityCache.get(key);
  }

  if (commonRatings.size === 0) {
    return 0; // No common ratings
  }

  let numerator = 0;
  let denominator1 = 0;
  let denominator2 = 0;

  for (const index of commonRatings) {
    const nonNegativeRatings = ratings[index].filter((rating) => rating !== 0);
    const nonNegativeCount = nonNegativeRatings.length;

    const deviation1 =
      item1[index] -
      nonNegativeRatings.reduce((sum, r) => sum + r, 0) / nonNegativeCount;
    const deviation2 =
      item2[index] -
      nonNegativeRatings.reduce((sum, r) => sum + r, 0) / nonNegativeCount;

    numerator += deviation1 * deviation2;
    denominator1 += deviation1 ** 2;
    denominator2 += deviation2 ** 2;
  }

  const similarity =
    Math.abs(numerator / (Math.sqrt(denominator1) * Math.sqrt(denominator2)));
  if (!isNaN(similarity) && similarity > 0) {
    // Cache the calculated similarity
    similarityCache.set(key, similarity);

    return similarity;
  } else {
    return 0;
  }
}

//return the neighbors of this item
function findNeighborsAboveThreshold(
  item,
  ratingsMatrix,
  threshold,
  userIndex,
  itemIndex
) {
  const neighbors = [];

  for (
    let otherItemIndex = 0;
    otherItemIndex < ratingsMatrix[0].length;
    otherItemIndex++
  ) {
    const neighborRating = ratingsMatrix[userIndex][otherItemIndex];

    if (
      neighborRating === 0 ||
      neighborRating < 0 ||
      neighborRating > 5 ||
      otherItemIndex === itemIndex
    ) {
      continue; // Skip items with no ratings, the same item, or invalid ratings
    }

    const otherItem = ratingsMatrix.map((row) => row[otherItemIndex]);

    const commonRatings = findCommonRatings(item, otherItem);

    if (commonRatings.size === 0) {
      continue;
    }

    // if (commonRatings.size < itemThreshold) {
    //   continue; // Skip items that don't meet the threshold
    // }

    const similarity = adjustedCosineSimilarity(
      item,
      otherItem,
      ratingsMatrix,
      commonRatings
    );

    // Check if the similarity exceeds the threshold
    if (similarity > threshold) {
      neighbors.push({ index: otherItemIndex, similarity });
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

for (let userIndex = 0; userIndex < numUsers; userIndex++) {
  for (let itemIndex = 0; itemIndex < numItems; itemIndex++) {
    const testRating = ratingsMatrix[userIndex][itemIndex];
    //skip invalid ratings 
    if (
      testRating <= 0 ||
      testRating > 5 ||
      isNaN(testRating)
    ) {
      continue;
    }

    if (testRating !== 0) {
      totalPredictions++;

      // Temporarily remove the test rating for LOOCV
      ratingsMatrix[userIndex][itemIndex] = 0;

      const item = ratingsMatrix.map((row) => row[itemIndex]);

      // Find neighbors above the similarity threshold
      const neighbors = findNeighborsAboveThreshold(
        item,
        ratingsMatrix,
        similarityThreshold,
        userIndex,
        itemIndex
      );

      // Output information about the prediction
      // console.log(`Predicting for user: ${users[userIndex]}`);
      // console.log(`Predicting for item: ${items[itemIndex]}`);
      // console.log(`Found ${neighbors.length} valid neighbors:`);

      if (neighbors.length === 0) {
        totalNoValidNeighbors++;
        // No valid neighbors, use mean user rating as fallback
        const userMeanRating = getUserMeanRating(userIndex, ratingsMatrix);
        userItemMatrix[userIndex][itemIndex] = userMeanRating;
      } else {
        let prediction = 0;
        let totalSimilarity = 0;

        for (const neighbor of neighbors) {
          const neighborIndex = neighbor.index;
          const similarity = neighbor.similarity;
          const neighborRating = ratingsMatrix[userIndex][neighborIndex];
          // console.log(`${items[neighborIndex]} sim=${similarity}`);
          prediction += similarity * neighborRating;
          totalSimilarity += similarity;
        }

        prediction /= totalSimilarity;

        userItemMatrix[userIndex][itemIndex] = prediction;
        totalNeighborsUsed += neighbors.length;
      }

      // console.log(
      //   `Initial predicted value: ${userItemMatrix[userIndex][itemIndex]}`
      // );
      // Handle extreme cases for the fallback prediction
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

//output
const meanAbsoluteError = totalAbsoluteError / totalPredictions;
console.log(
  `Item-Based, Threshold-based, Ignore Negatives, LOOCV MAE = ${meanAbsoluteError}`
);
console.log(`Total predictions: ${totalPredictions}`);
console.log(`Total under predictions (<1): ${totalUnderPredictions}`);
console.log(`Total over predictions (>5): ${totalOverPredictions}`);
console.log(
  `Number of cases with no valid neighbors: ${totalNoValidNeighbors}`
);
console.log(`Average neighbors used: ${totalNeighborsUsed / totalPredictions}`);

console.timeEnd("wholeCode");//end timer