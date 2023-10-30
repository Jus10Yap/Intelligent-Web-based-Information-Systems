const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let bookSchema = new Schema({
    url: String,
    title: String,
    description: String,
    outgoingLinks: [String],
    pageRank: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("Book", bookSchema);