console.time("wholeCode");
const fs = require("fs");

const filename = "./testFiles/parsed-data-trimmed.txt";
const data = fs.readFileSync(filename, "utf8").split("\n");
const [numUsers, numItems] = data[0].split(" ").map(Number);
const users = data[1].split(" ");
const items = data[2].split(" ");

console.log(`Filename: ${filename}`);

const userRatings = data
  .slice(3, 3 + numUsers)
  .map((row) => row.split(" ").map(Number));

const defaultNeighborhoodSize = 5;

const userItemMatrix = userRatings.map((row) => [...row]);
const ratingsMatrix = userRatings.map((row) => [...row]);

const similarityCache = new Map();
const userMeanRatingCache = new Map();

function findCommonRatings(item1, item2) {
  const commonRatings = new Set();

  for (let index = 0; index < item1.length; index++) {
    if (item1[index] !== 0 && item2[index] !== 0) {
      commonRatings.add(index);
    }
  }

  return commonRatings;
}

function getUserMeanRating(userIndex, ratingsMatrix) {
  if (userMeanRatingCache.has(userIndex)) {
    return userMeanRatingCache.get(userIndex);
  }

  const userRatings = ratingsMatrix[userIndex].filter((rating) => rating !== 0);
  let sum = 0;
  let count = 0;

  for (const rating of userRatings) {
    if (rating !== 0) {
      sum += rating;
      count++;
    }
  }

  const meanRating = count > 0 ? sum / count : 0;

  userMeanRatingCache.set(userIndex, meanRating);
  return meanRating;
}

function adjustedCosineSimilarity(item1, item2, ratings, commonRatings) {
  const key = `${item1.join(",")}_${item2.join(",")}`;

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
    numerator / (Math.sqrt(denominator1) * Math.sqrt(denominator2));
  if (!isNaN(similarity) && similarity > 0) {
    // Cache the calculated similarity
    similarityCache.set(key, similarity);

    return similarity;
  } else {
    return 0;
  }
}

function findKNeighbors(
  item,
  ratingsMatrix,
  neighborhoodSize,
  userIndex,
  itemIndex
) {
  const itemSimilarities = [];

  for (
    let otherItemIndex = 0;
    otherItemIndex < ratingsMatrix[0].length;
    otherItemIndex++
  ) {
    const neighborRating = ratingsMatrix[userIndex][otherItemIndex];

    if (neighborRating === 0 || neighborRating < 0 || neighborRating > 5) {
      continue; // Skip items with no ratings during prediction
    }

    const userRating = ratingsMatrix[userIndex][itemIndex];

    if (userRating < 0 || userRating > 5) {
      continue; // Skip items with no ratings during prediction
    }

    if (otherItemIndex === itemIndex) {
      continue; // Skip the same item
    }

    const otherItem = ratingsMatrix.map((row) => row[otherItemIndex]);

    const commonRatings = findCommonRatings(item, otherItem);

    const similarity = adjustedCosineSimilarity(
      item,
      otherItem,
      ratingsMatrix,
      commonRatings
    );

    if (similarity > 0) {
      itemSimilarities.push({ index: otherItemIndex, similarity });
    }
  }

  // Partial sort to get top-k similarities
  itemSimilarities.sort((a, b) => b.similarity - a.similarity);
  return itemSimilarities.slice(0, neighborhoodSize);
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

      // Find the k nearest neighbors based on adjusted cosine similarity
      const kNeighbors = findKNeighbors(
        item,
        ratingsMatrix,
        defaultNeighborhoodSize,
        userIndex,
        itemIndex
      );

      // Output information about the prediction
      console.log(`Predicting for user: ${users[userIndex]}`);
      console.log(`Predicting for item: ${items[itemIndex]}`);
      console.log(`Found ${kNeighbors.length} valid neighbors:`);

      if (kNeighbors.length === 0) {
        totalNoValidNeighbors++;
        // No valid neighbors, use mean user rating as fallback
        const userMeanRating = getUserMeanRating(userIndex, ratingsMatrix);

        userItemMatrix[userIndex][itemIndex] = userMeanRating;
      } else {
        let prediction = 0;
        let totalSimilarity = 0;

        for (const neighbor of kNeighbors) {
          const neighborIndex = neighbor.index;
          const similarity = neighbor.similarity;
          const neighborRating = ratingsMatrix[userIndex][neighborIndex];
          console.log(`${items[neighborIndex]} sim=${similarity}`);
          // Skip items with no ratings during prediction
          prediction += similarity * neighborRating;
          totalSimilarity += similarity;
        }

        prediction /= totalSimilarity;

        userItemMatrix[userIndex][itemIndex] = prediction;
        totalNeighborsUsed += kNeighbors.length;
      }

      console.log(
        `Initial predicted value: ${userItemMatrix[userIndex][itemIndex]}`
      );
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

      console.log(
        `Final predicted value: ${userItemMatrix[userIndex][itemIndex]}`
      );
      console.log();

      // Restore the test rating after prediction for the next iteration
      ratingsMatrix[userIndex][itemIndex] = testRating;
    }
  }
}

const meanAbsoluteError = totalAbsoluteError / totalPredictions;
console.log(
  `Item-Based, top-K, Ignore Negatives, LOOCV MAE = ${meanAbsoluteError}`
);
console.log(`Total predictions: ${totalPredictions}`);
console.log(`Total under predictions (<1): ${totalUnderPredictions}`);
console.log(`Total over predictions (>5): ${totalOverPredictions}`);
console.log(
  `Number of cases with no valid neighbors: ${totalNoValidNeighbors}`
);
console.log(`Average neighbors used: ${totalNeighborsUsed / totalPredictions}`);

console.timeEnd("wholeCode");
