console.time("wholeCode"); //start timer for code
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

const defaultNeighborhoodSize = 10;
const userThreshold = 50;

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

function findKNeighborsUserBased(
  user,
  ratingsMatrix,
  neighborhoodSize,
  userIndex,
  itemIndex
) {
  const userSimilarities = new MaxHeap();
  let similarityOneCount = 0;

  for (let otherUserIndex = 0; otherUserIndex < numUsers; otherUserIndex++) {
    // if (
    //   ratingsMatrix[otherUserIndex].filter((rating) => rating !== 0).length <
    //   userThreshold
    // ) {
    //   continue;
    // }
    const neighborRating = ratingsMatrix[otherUserIndex][itemIndex];

    if (
      neighborRating === 0 ||
      neighborRating < 0 ||
      neighborRating > 5 ||
      otherUserIndex === userIndex
    ) {
      continue; //skip users with no ratings during prediction or the current user
    }

    const otherUser = ratingsMatrix[otherUserIndex];
    const similarity = pearsonCorrelation(user, otherUser);

   

    // Check if the similarity is 1
    if (similarity === 1) {
      similarityOneCount++;

      if (similarityOneCount === neighborhoodSize) {
        break; // Exit the loop if 5 neighbors with similarity 1 are found
      }
    }

    if (similarity > 0) {
      userSimilarities.insert({ index: otherUserIndex, similarity });
    }
  }

  //extract top-k similarities from the max heap
  const topSimilarities = [];
  for (
    let i = 0;
    i < neighborhoodSize && userSimilarities.heap.length > 0;
    i++
  ) {
    topSimilarities.push(userSimilarities.extractMax());
  }

  return topSimilarities;
}

//heap implementation i used from comp2402 but in js
class MaxHeap {
  constructor() {
    this.heap = [];
  }

  insert(item) {
    this.heap.push(item);
    this.heapifyUp();
  }

  extractMax() {
    const max = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.heapifyDown();
    }

    return max;
  }

  heapifyUp() {
    let currentIndex = this.heap.length - 1;

    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);

      if (
        this.heap[parentIndex].similarity >= this.heap[currentIndex].similarity
      ) {
        break;
      }

      [this.heap[parentIndex], this.heap[currentIndex]] = [
        this.heap[currentIndex],
        this.heap[parentIndex],
      ];
      currentIndex = parentIndex;
    }
  }

  heapifyDown() {
    let currentIndex = 0;

    while (true) {
      const leftChildIndex = 2 * currentIndex + 1;
      const rightChildIndex = 2 * currentIndex + 2;
      let nextIndex = currentIndex;

      if (
        leftChildIndex < this.heap.length &&
        this.heap[leftChildIndex].similarity > this.heap[nextIndex].similarity
      ) {
        nextIndex = leftChildIndex;
      }

      if (
        rightChildIndex < this.heap.length &&
        this.heap[rightChildIndex].similarity > this.heap[nextIndex].similarity
      ) {
        nextIndex = rightChildIndex;
      }

      if (nextIndex === currentIndex) {
        break;
      }

      [this.heap[currentIndex], this.heap[nextIndex]] = [
        this.heap[nextIndex],
        this.heap[currentIndex],
      ];
      currentIndex = nextIndex;
    }
  }
}

let totalAbsoluteError = 0;
let totalPredictions = 0;
let totalNeighborsUsed = 0;
let totalNoValidNeighbors = 0;
let totalUnderPredictions = 0;
let totalOverPredictions = 0;

//leave one out cross validation
for (let userIndex = 0; userIndex < numUsers; userIndex++) {
  for (let itemIndex = 0; itemIndex < numItems; itemIndex++) {
    const testRating = ratingsMatrix[userIndex][itemIndex];

    //invalid current rating
    if (testRating <= 0 || testRating > 5 || isNaN(testRating)) {
      continue;
    }

    if (testRating !== 0) {
      totalPredictions++;

      //temporarily remove the test rating for LOOCV
      ratingsMatrix[userIndex][itemIndex] = 0;

      const user = ratingsMatrix[userIndex];

      //find the k nearest neighbors based on adjusted cosine similarity
      const kNeighbors = findKNeighborsUserBased(
        user,
        ratingsMatrix,
        defaultNeighborhoodSize,
        userIndex,
        itemIndex
      );

      //output information about the prediction per user/item
      // console.log(`Predicting for user: ${users[userIndex]}`);
      // console.log(`Predicting for item: ${items[itemIndex]}`);
      // console.log(`Found ${kNeighbors.length} valid neighbors:`);

      const userMean =
        user.reduce((acc, rating) => (rating !== 0 ? acc + rating : acc), 0) /
        user.filter((rating) => rating !== 0).length;

      //no valid neighbors
      if (kNeighbors.length === 0) {
        totalNoValidNeighbors++;
        userItemMatrix[userIndex][itemIndex] = userMean;
      } // valid neighbors are used for prediction
      else {
        let prediction = 0;
        let totalSimilarity = 0;

        for (const neighbor of kNeighbors) {
          const neighborIndex = neighbor.index;
          const similarity = neighbor.similarity;

          const neighborRating = ratingsMatrix[neighborIndex][itemIndex];
          const neighborMean =
            ratingsMatrix[neighborIndex].reduce(
              (acc, rating) => (rating !== 0 ? acc + rating : acc),
              0
            ) /
            ratingsMatrix[neighborIndex].filter((rating) => rating !== 0)
              .length;

          prediction += similarity * (neighborRating - neighborMean);
          totalSimilarity += parseFloat(similarity); // Use absolute similarity for weighting
        }

        prediction = userMean + prediction / totalSimilarity;

        userItemMatrix[userIndex][itemIndex] = prediction;
        totalNeighborsUsed += kNeighbors.length;
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

//final outputs
const meanAbsoluteError = totalAbsoluteError / totalPredictions;
console.log(`User-Based, Pearson Correlation Coefficient, File ${filename}`);
console.log(`Total predictions: ${totalPredictions}`);
console.log(`Total under predictions (<1): ${totalUnderPredictions}`);
console.log(`Total over predictions (>5): ${totalOverPredictions}`);
console.log(
  `Number of cases with no valid neighbors: ${totalNoValidNeighbors}`
);
console.log(`Average neighbors used: ${totalNeighborsUsed / totalPredictions}`);
console.log(`LOOCV MAE = ${meanAbsoluteError}`);

console.timeEnd("wholeCode");
