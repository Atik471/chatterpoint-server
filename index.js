const express = require("express");
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.SK_STRIPE);
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cookieParser());
app.use(express.json());

const allowedOrigins = ["http://localhost:5173", "https://chatterpoint.web.app"];

app.use(
  cors({
    origin: allowedOrigins , 
    credentials: true,
  })
);


app.post("/jwt", (req, res) => {
  const email = req.body;
  const token = jwt.sign(email, process.env.JWT_SECRET, { expiresIn: "12h" });
  res
    // .cookie("token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   // sameSite: "none",
    // })
    .send({ jwtSuccess: true, token });
});


const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access: No token provided" });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).send({ message: "Unauthorized access: No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access: Invalid token" });
    }

    req.email = decoded;
    next();
  });
};



const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8nuar.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("ChatterPoint API");
});

const port = process.env.PORT || 5000;

async function run() {
  try {
    //await client.connect();
    //await client.db("admin").command({ ping: 1 });
    const ChatterPoint = client.db("ChatterPoint");
    const userCollection = ChatterPoint.collection("users");
    const postCollection = ChatterPoint.collection("posts");
    const commentCollection = ChatterPoint.collection("comments");
    const announcementCollection = ChatterPoint.collection("announcements");
    const reportCollection = ChatterPoint.collection("reports");
    const tagCollection = ChatterPoint.collection("tags");

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // app.post("/logout", (req, res) => {
    //   res.clearCookie("token", {
    //     httpOnly: true,
    //     secure: process.env.NODE_ENV === "production",
    //     sameSite: "strict",
    //   });
    //   return res.status(200).send({ message: "Logged out successfully" });
    // });

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

    app.post("/posts", verifyToken, async (req, res) => {
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
      const { page = 1, limit = 5, tag, sort  } = req.query;
      const skip = (page - 1) * limit;

      const sortField = sort === "true" ? { popularity: -1 } : { _id: -1 };

      try {
        const filter = tag ? { tags: tag } : {};

        const posts = await postCollection
        .aggregate([
          { $match: filter },
          {
            $addFields: {
              popularity: { $subtract: ["$upvote", "$downvote"] },
            },
          },
          { $sort: sortField },
          { $skip: skip },
          { $limit: Number(limit) },
        ])
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

    app.get("/my-posts/:email", verifyToken,  async (req, res) => { //verifyToken,
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

    app.put("/post/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { title, tags, description } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Post ID format" });
      }

      try {
        const objectId = new ObjectId(id);
        const post = await postCollection.findOne({ _id: objectId });

        if (!post) {
          return res.status(404).json({ message: "Post not found" });
        }

        if (post.email !== req.email.email) {
          return res.status(403).json({ message: "Forbidden: you do not own this post" });
        }

        const result = await postCollection.updateOne(
          { _id: objectId },
          { $set: { title, tags, description, edited: true } }
        );

        res.status(200).json({ message: "Post updated successfully!", result });
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });

    app.delete("/post/:id", verifyToken, async (req, res) => {
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

        if (post.email !== req.email.email) {
          return res.status(403).json({ message: "Forbidden: you do not own this post" });
        }

        await postCollection.deleteOne({ _id: objectId });
        await commentCollection.deleteMany({ post: id });

        res.status(200).json({ message: "Post deleted successfully!" });
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });

    app.post("/post/:id/vote", async (req, res) => {
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

        const updateField = vote === 1 ? { upvote: 1 } : { downvote: 1 };
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
    });

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
      const { page = 1, limit = 5 } = req.query;
      const skip = (page - 1) * limit;

      try {
        const comments = await commentCollection
          .find({ post: postId })
          .sort({ _id: -1 })
          .skip(skip)
          .limit(Number(limit))
          .toArray();

        const totalComments = await commentCollection.countDocuments({
          post: postId,
        });

        res.status(200).json({
          message: "Comments fetched successfully!",
          comments,
          totalComments,
          totalPages: Math.ceil(totalComments / limit),
          currentPage: page,
        });
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });

    app.get("/users", async (req, res) => {
      const { page = 1, limit = 5 } = req.query;
      const skip = (page - 1) * limit;
      try {
        const users = await userCollection
          .find()
          .skip(skip)
          .limit(Number(limit))
          .toArray();

        const totalUsers = await userCollection.countDocuments({});

        res.status(200).json({
          message: "Comments fetched successfully!",
          users,
          totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
          currentPage: page,
        });
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });

    app.put("/user/update-role/:id", verifyToken, async (req, res) => {
      const userId = req.params.id;
      const { role } = req.body;

      if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID format." });
      }

      try {
        const filter = { _id: new ObjectId(userId) };
        const updateDoc = {
          $set: { role: role },
        };

        const result = await userCollection.updateOne(filter, updateDoc);

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: "User not found or role unchanged." });
        }

        res.status(200).json({ message: "User role updated successfully!" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update user role." });
      }
    });

    app.post("/announcements", verifyToken, async (req, res) => {
      const newAnnouncement = req.body;

      try {
        const result = await announcementCollection.insertOne(newAnnouncement);

        res
          .status(201)
          .json({
            message: "Announcement posted successfully!",
            result: result,
          });
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });

    app.post("/report", async (req, res) => {
      const newReport = req.body;

      try {
        const result = await reportCollection.insertOne(newReport);

        res
          .status(201)
          .json({ message: "Report submitted successfully!", result: result });
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });

    app.get("/report", async (req, res) => {
      const { page = 1, limit = 5 } = req.query;
      const skip = (page - 1) * limit;
      try {
        const reports = await reportCollection.find().skip(skip)
        .limit(Number(limit)).toArray();

        const totalReports = await reportCollection.countDocuments({});

        res.status(200).json({
          reports,
          totalReports,
          totalPages: Math.ceil(totalReports / limit),
          currentPage: page,
        });
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });

    app.delete("/report", async (req, res) => {
      let reportId = req.body.reportId;
      let commentId = req.body.commentId;
      const action = req.body.action;

      try {
        if (!ObjectId.isValid(reportId && commentId)) {
          return res.status(400).json({ message: "Invalid ID format." });
        }

        reportId = new ObjectId(reportId);
        commentId = new ObjectId(commentId);

        if (action === "report") {
          const resultReport = await reportCollection.deleteOne({
            _id: reportId,
          });
          if (resultReport.deletedCount === 1) {
            res.status(200).json({ message: "Report deleted successfully." });
          } else {
            res.status(404).json({ message: "Report not found." });
          }
        }

        if (action === "comment") {
          const resultComment = await commentCollection.deleteOne({
            _id: commentId,
          });
          const resultReport = await reportCollection.deleteOne({
            _id: reportId,
          });

          if (resultComment.deletedCount === 1) {
            res.status(200).json({ message: "Comment deleted successfully." });
          } else {
            res.status(404).json({ message: "Comment not found." });
          }
        }
      } catch (error) {
        console.error("Error deleting:", error);
        res.status(500).json({ message: "Server error. Please try again." });
      }
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { amount, id } = req.body;

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).send({ error: "Failed to create payment intent" });
      }
    });

    app.put("/update-badges", async (req, res) => {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).send({ error: "User ID required" });
      }

      try {
        await userCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $push: { badges: "gold" } }
        );

        res.send({
          message: "User badges updated successfully",
        });
      } catch (error) {
        console.error("Error updating user badges:", error);
        res.status(500).send({ error: "Failed to update user badges" });
      }
    });

    app.get("/announcements", async (req, res) => {
      try {
        const announcements = await announcementCollection.find().toArray();

        res.status(200).json(announcements);
      } catch (error) {
        res.status(500).json({ message: "Server error. Please try again." });
        console.log(error);
      }
    });

    app.get("/post-count/:email", verifyToken, async (req, res) => {
      const { email } = req.params;

      if (!email) {
        return res.status(400).send({ error: "User email is required" });
      }

      try {
        const postCount = await postCollection.countDocuments({ email: email });

        res.status(200).send({
          postCount: postCount,
        });
      } catch (error) {
        console.error("Error fetching posts count:", error);
        res.status(500).send({ error: "Failed to fetch posts count" });
      }
    });

    // app.get("/count-comment/:postId", async (req, res) => {
    //   const { postId } = req.query;
    //   try {
    //     const commentCount = await commentCollection.countDocuments({});

    //     res.status(200).json(commentCount);
    //   } catch (error) {
    //     res.status(500).json({ message: "Server error. Please try again." });
    //     console.log(error);
    //   }
    // });

    app.get("/stats", verifyToken, async (req, res) => {
      try {
        const postCount = await postCollection.countDocuments({});
        const userCount = await userCollection.countDocuments({});
        const commentCount = await commentCollection.countDocuments({});

        res.status(200).send({
          userCount,
          postCount,
          commentCount,
        });
      } catch (error) {
        console.error("Error fetching posts count:", error);
        res.status(500).send({ error: "Failed to fetch posts count" });
      }
    });

    app.get("/tags", async (req, res) => {
      try {
        const tags = await tagCollection.find({}).toArray();
        
        res.status(200).send(tags);
      } catch (error) {
        console.error("Error fetching:", error);
        res.status(500).send({ error: "Failed to fetch" });
      }
    });

    app.post("/tags", verifyToken, async (req, res) => {
      const newTag = req.body;

      try {
        const result = await tagCollection.insertOne(newTag);

        res
          .status(201)
          .json({ message: "Tag addedsuccessfully!", result: result });
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

app.listen(port, () => {
  console.log(`ChatterPoint is running on port: http://localhost:${port}`);
});
