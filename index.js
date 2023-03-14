require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
//Mongoose Set up
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const userSchema = new Schema(
  {
    username: { type: String, required: true },
  },
  { versionKey: false }
);
const User = mongoose.model("User", userSchema);
const exerciseSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: User },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date, get: (date) => date.toDateString() },
  },
  { versionKey: false, toJSON: { getters: true } }
);
const Exercise = mongoose.model("Exercise", exerciseSchema);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//Set up
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async function (req, res) {
  const users = await User.find();
  return res.json(users);
});

app.post("/api/users", async function (req, res) {
  const { username } = req.body;
  const newUser = new User({ username });
  return res.json(await newUser.save());
});

app.post("/api/users/:_id/exercises", async function (req, res) {
  const { _id, description, duration, date } = req.body;
  console.log(date);
  console.log();
  const newExercise = new Exercise({
    user: _id,
    description,
    duration,
    date: date ? date : Date.now(),
  });
  console.log(newExercise);
  return res.json(await newExercise.save());
});

app.get("/api/users/:_id/logs", async function (req, res) {
  return res.json(await Exercise.find());
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
