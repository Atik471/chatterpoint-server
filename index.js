const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8nuar.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    const ChatterPoint = client.db("ChatterPoint");
    const userCollection = ChatterPoint.collection("users");
    const postCollection = ChatterPoint.collection("posts");
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    app.post("/users/register", async (req, res) => {
      const newUser = req.body;

      try {
        const existingUser = await userCollection.findOne({
          email: newUser.email,
        });
        if (existingUser) {
          return res.status(400).json({ message: "Email already exists" });
        }
        const result = await userCollection.insertOne(newUser);
        res
          .status(201)
          .json({ message: "User registered successfully!", result: result });
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });

    app.post("/posts", async (req, res) => {
      const newPost = req.body;

      try {
        const result = await postCollection.insertOne(newPost);
        res
          .status(201)
          .json({ message: "Post created successfully!", result: result });
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });

    app.get("/posts", async (req, res) => {
      const { page = 1, limit = 5 } = req.query;
      const skip = (page - 1) * limit;

      try {
        const posts = await postCollection
          .find({})
          .skip(skip)
          .limit(Number(limit))
          .toArray();

        const totalPosts = await postCollection.countDocuments();

        res.status(200).json({
          message: "Posts fetched successfully!",
          posts,
          totalPosts,
          totalPages: Math.ceil(totalPosts / limit),
          currentPage: page,
        });
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });

    app.get("/post/:id", async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Post ID format" });
      }

      try {
        const objectId = new ObjectId(id);
        const post = await postCollection.findOne({ _id: objectId });
        if (!post) {
          return res.status(404).json({ message: "Post not found" });
        }
        res.status(200).json(post);
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });
  } finally {
    //await client.close();
  }
}
run().catch(console.dir);

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("ChatterPoint API");
});

app.listen(port, () => {
  console.log(`ChatterPoint is running on port: http://localhost:${port}`);
});
