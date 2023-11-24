const fs = require("fs");
// Read and parse the input file
const filename = "./testFiles/testa.txt"; 
const data = fs.readFileSync(filename, "utf8").split("\n");
const [numUsers, numItems] = data[0].split(" ").map(Number);
const users = data[1].split(" ");
const items = data[2].split(" ");

console.log(`Filename: ${filename}`);
// Parse user ratings and handle -1 values
const userRatings = [];
for (let i = 3; i < 3 + numUsers; i++) {
  const ratings = data[i].split(" ").map(Number);
  userRatings.push(ratings);
}

const defaultNeighborhoodSize = 2;

// Initialize user-item matrix
const userItemMatrix = userRatings.map((row) => row.slice());//this one is gonna be manipulated
const ratingsMatrix = userRatings.map((row) => row.slice());// this is the referenced matrix

function adjustedCosineSimilarity(item1, item2, ratings) {
   
  const commonRatings = item1
    .map((rating, index) => (rating !== -1 && item2[index] !== -1 ? index : -1))
    .filter((index) => index !== -1);
 
  if (commonRatings.length === 0) {
    return 0; // No common ratings
  }

  let numerator = 0;
  let denominator1 = 0;
  let denominator2 = 0;

  for (let i = 0; i < commonRatings.length; i++) {
    const index = commonRatings[i];
    if (ratings[index] && ratings[index].length > 0) {
      const nonNegativeRatings = ratings[index].filter(
        (rating) => rating !== -1
      );
      const nonNegativeCount = nonNegativeRatings.length;


      const deviation1 =
        item1[index] -
        nonNegativeRatings.reduce((sum, rating) => sum + rating, 0) /
          nonNegativeCount;
      const deviation2 =
        item2[index] -
        nonNegativeRatings.reduce((sum, rating) => sum + rating, 0) /
          nonNegativeCount;

      numerator += deviation1 * deviation2;
      denominator1 += deviation1 ** 2;
      denominator2 += deviation2 ** 2;
    }
  }

  const similarity =
    numerator / (Math.sqrt(denominator1) * Math.sqrt(denominator2));

    //console.log(`item1 ${item1} and item2 ${item2} : similarity ${similarity}`);

  return isNaN(similarity) ? 0 : similarity;
}
function findKNeighbors(item, ratingsMatrix, neighborhoodSize, userIndex, itemIndex) {
  const itemSimilarities = [];

  for (let otherItemIndex = 0; otherItemIndex < ratingsMatrix[0].length; otherItemIndex++) {
    if (otherItemIndex !== itemIndex) {
      const otherItem = ratingsMatrix.map((row) => row[otherItemIndex]);
      const similarity = adjustedCosineSimilarity(item, otherItem, ratingsMatrix);
     
      if (similarity > 0) {
        const neighborRating = ratingsMatrix[userIndex][otherItemIndex];
        if (neighborRating !== -1) {
          itemSimilarities.push({ index: otherItemIndex, similarity });
        }
      }
    }
  }

  itemSimilarities.sort((a, b) => b.similarity - a.similarity);
  
  return itemSimilarities.slice(0, neighborhoodSize);
}
// Predict missing ratings
for (let userIndex = 0; userIndex < numUsers; userIndex++) {
  for (let itemIndex = 0; itemIndex < numItems; itemIndex++) {
    if (ratingsMatrix[userIndex][itemIndex] === -1) {
      const item = ratingsMatrix.map((row) => row[itemIndex]);

      // Find the k nearest neighbors based on adjusted cosine similarity
      const kNeighbors = findKNeighbors(item, ratingsMatrix, defaultNeighborhoodSize, userIndex, itemIndex);

      
      // console.log(`Neighbors for Item ${itemIndex} and User ${userIndex}:`);
      // for (const neighbor of kNeighbors) {
      //   const neighborIndex = neighbor.index;
      //   const similarity = neighbor.similarity;
      //   const neighborRating = ratingsMatrix[userIndex][neighborIndex];
      //   console.log(`  Neighbor ${neighborIndex}: Similarity ${similarity}, Rating ${neighborRating}`);
      // }

      // Predict the rating
      let prediction = 0;
      let totalSimilarity = 0;

      for (const neighbor of kNeighbors) {
        const neighborIndex = neighbor.index;
        const similarity = neighbor.similarity;
        const neighborRating = ratingsMatrix[userIndex][neighborIndex];
        if (neighborRating !== -1) {
          prediction += similarity * neighborRating;
          totalSimilarity += Math.abs(similarity);
        }
      }

      if (totalSimilarity !== 0) {
        prediction /= totalSimilarity;
        userItemMatrix[userIndex][itemIndex] = prediction;
      }
    }
  }
}
  
  
  // Print the completed matrix with predicted ratings
  console.log(`${numUsers} ${numItems}`);
  console.log(users.join(" "));
  console.log(items.join(" "));
  
  for (let i = 0; i < numUsers; i++) {
    const row = userItemMatrix[i].map((rating) =>
      rating !== -1 ? (Number.isInteger(rating) ? rating : rating) : -1
    );
    console.log(row.join(" "));
  }