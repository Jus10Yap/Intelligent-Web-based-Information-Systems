const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let fruitSchema = new Schema({
    url: String,
    content: String,
    outgoingLinks: [String],
    incomingLinks: [String],
    pageRank: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("Fruit", fruitSchema);
