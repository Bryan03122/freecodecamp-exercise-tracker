require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
//Mongoose Set up
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const exerciseSchema = new Schema(
  {
    // user: { type: Schema.Types.ObjectId, ref: "User" },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date, get: (date) => date.toDateString() },
  },
  { versionKey: false, toJSON: { getters: true, virtuals: true }, id: false }
);
exerciseSchema.options.toJSON.transform = function (doc, ret, options) {
  delete ret._id;
  return ret;
};
const userSchema = new Schema(
  {
    username: { type: String, required: true },
    exercises: [exerciseSchema],
  },
  { versionKey: false }
);
const User = mongoose.model("User", userSchema);
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
  const users = await User.find().select({ exercises: 0 });
  return res.json(users);
});

app.post("/api/users", async function (req, res) {
  const { username: _username } = req.body;
  const newUser = new User({ username: _username });
  const { _id, username } = await newUser.save();
  return res.json({ _id, username });
});

app.post("/api/users/:_id/exercises", async function (req, res) {
  const { _id, description, duration, date } = req.body;
  const newExercise = new Exercise({
    description,
    duration,
    date: date ? date : Date.now(),
  });
  const user = await User.findByIdAndUpdate(
    _id,
    {
      $push: {
        exercises: newExercise,
      },
    },
    { new: true }
  );
  return res.json({
    _id: user._id,
    username: user.username,
    ...user.exercises[0].toJSON(),
  });
});

app.get("/api/users/:_id/logs", async function (req, res) {
  const { from, to, limit } = req.query;
  const { _id } = req.params;

  const users = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(_id),
      },
    },
    {
      $addFields: {
        log: {
          $filter: {
            input: "$exercises",
            as: "exercise",
            cond: {
              $and: [
                {
                  $lte: [
                    "$$exercise.date",
                    !isNaN(new Date(to).getTime())
                      ? new Date(to)
                      : { $max: "$$exercise.date" },
                  ],
                },
                {
                  $gte: [
                    "$$exercise.date",
                    !isNaN(new Date(from).getTime())
                      ? new Date(from)
                      : { $min: "$$exercise.date" },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        log: {
          $slice: ["$log", !isNaN(limit) ? +limit : { $size: "$exercises" }],
        },
      },
    },
    {
      $project: { username: 1, count: { $size: "$log" }, log: 1 },
    },
  ]);

  const user = users[0];
  user.log = user.log.map((log) => {
    console.log(log);
    delete log._id;
    return {
      ...log,
      date: log.date.toDateString(),
    };
  });
  return res.json({
    _id: user._id,
    username: user.username,
    count: user.count,
    log: user.log,
  });
});

app.delete("/api/exercises", async function (req, res) {
  return res.json(await Exercise.deleteMany());
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
