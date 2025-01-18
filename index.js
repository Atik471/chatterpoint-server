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
    //await client.connect();
    //await client.db("admin").command({ ping: 1 });
    const ChatterPoint = client.db("ChatterPoint");
    const userCollection = ChatterPoint.collection("users");
    const postCollection = ChatterPoint.collection("posts");
    const commentCollection = ChatterPoint.collection("comments");
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

    app.get("/user/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await userCollection.findOne({ email });

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
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
      const { page = 1, limit = 5, tag } = req.query;
      const skip = (page - 1) * limit;

      try {
        const filter = tag ? { tags: tag } : {};

        const posts = await postCollection
          .find(filter)
          .sort({ _id: -1 })
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

    app.get("/my-posts/:email", async (req, res) => {
      const email = req.params.email;
      const { page = 1, limit = 5 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      try {
        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        const filter = { email };

        const posts = await postCollection
          .find(filter)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(Number(limit))
          .toArray();

        const totalPosts = await postCollection.countDocuments(filter);

        res.status(200).json({
          message: "Posts fetched successfully!",
          posts,
          totalPosts,
          totalPages: Math.ceil(totalPosts / limit),
          currentPage: Number(page),
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

    /*app.post("/post/:id/vote", async (req, res) => {
      const id = req.params.id;
      const vote = req.body.vote;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Post ID format" });
      }

      if (vote !== 1 && vote !== -1) {
        return res
          .status(400)
          .json({ message: "Invalid vote value. Must be 1 or -1." });
      }

      try {
        const objectId = new ObjectId(id);
        const post = await postCollection.findOne({ _id: objectId });

        if (!post) {
          return res.status(404).json({ message: "Post not found" });
        }

        const updateField = vote === 1 ? { upvote: 1 } : { downvote: -1 };
        const result = await postCollection.updateOne(
          { _id: objectId },
          { $inc: updateField }
        );

        res
          .status(200)
          .json({ message: "Vote updated successfully!", result: result });
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });*/

    app.post("/comment", async (req, res) => {
      const newComment = req.body;
      const postId = newComment.post;

      try {
        const result = await commentCollection.insertOne(newComment);

        const updateResult = await postCollection.updateOne(
          { _id: new ObjectId(postId) },
          { $inc: { comments: 1 } }
        );

        if (updateResult.modifiedCount === 0) {
          return res.status(404).json({ message: "Post not found." });
        }

        res
          .status(201)
          .json({ message: "Comment submitted successfully!", result: result });
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });

    app.get("/comments/:post", async (req, res) => {
      const postId = req.params.post;

      try {
        const comments = await commentCollection
          .find({ post: postId })
          .toArray();

        res.status(200).json({
          message: "Comments fetched successfully!",
          comments,
        });
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
