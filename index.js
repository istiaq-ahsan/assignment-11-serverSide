const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://assignment-11-project-68d98.web.app",
    "https://assignment-11-project.netlify.app",
  ],
  credentials: true,
  optionalSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1pvay.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//verify token
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "Unauthorized Access" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    req.user = decoded;
  });
  next();
};

async function run() {
  try {
    const db = client.db("sprint-db");
    const marathonsCollection = db.collection("marathons");
    const applicantsCollection = db.collection("applicants");

    //generate jst
    app.post("/jwt", async (req, res) => {
      const email = req.body;

      const token = jwt.sign(email, process.env.JWT_SECRET, {
        expiresIn: "365d",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    //clear cookie
    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/add-marathon", async (req, res) => {
      const marathonData = req.body;
      const result = await marathonsCollection.insertOne(marathonData);
      res.send(result);
    });

    app.get("/all-marathons", async (req, res) => {
      const sort = req.query.sort;
      const search = req.query.search;

      let options = {};
      if (sort) options = { sort: { createdAt: sort === "asc" ? 1 : -1 } };
      let query = {
        title: {
          $regex: search,
          $options: "i",
        },
      };

      const result = await marathonsCollection.find(query, options).toArray();
      res.send(result);
    });

    app.get("/six-marathons", async (req, res) => {
      const result = await marathonsCollection.find().limit(8).toArray();
      res.send(result);
    });

    app.get("/upcoming-marathons", async (req, res) => {
      const result = await marathonsCollection.find().toArray();
      res.send(result);
    });

    app.get("/marathon-details/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await marathonsCollection.findOne(query);
      res.send(result);
    });

    app.post("/marathon-reg", verifyToken, async (req, res) => {
      const regData = req.body;

      const query = { email: regData.email, marathonId: regData.marathonId };

      const alreadyExist = await applicantsCollection.findOne(query);
      if (alreadyExist) {
        return res.status(400).send("you have already add this marathon");
      }

      const result = await applicantsCollection.insertOne(regData);

      const filter = { _id: new ObjectId(regData.marathonId) };
      const update = {
        $inc: { reg_count: 1 },
      };
      const updatedRegCount = await marathonsCollection.updateOne(
        filter,
        update
      );

      res.send(result);
    });

    app.get("/my-marathons/:email", verifyToken, async (req, res) => {
      const decodedEmail = req.user.email;
      const email = req.params.email;
      const query = { "creator.email": email };
      if (decodedEmail !== email)
        return res.status(401).send({ message: "Unauthorized Access" });

      const sort = req.query.sort;

      let options = {};

      if (sort) options = { sort: { createdAt: sort === "asc" ? 1 : -1 } };

      const result = await marathonsCollection.find(query, options).toArray();
      res.send(result);
    });

    app.get("/my-apply/:email", verifyToken, async (req, res) => {
      const decodedEmail = req.user.email;
      const email = req.params.email;
      const search = req.query.search;
      if (decodedEmail !== email)
        return res.status(401).send({ message: "Unauthorized Access" });

      const query = {
        $and: [
          { email: email },
          {
            title: {
              $regex: search,
              $options: "i",
            },
          },
        ],
      };

      const result = await applicantsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/myMarathonApplicant/:email", verifyToken, async (req, res) => {
      const decodedEmail = req.user.email;
      const email = req.params.email;
      const query = { organizer: email };

      if (decodedEmail !== email)
        return res.status(401).send({ message: "Unauthorized Access" });

      const result = await applicantsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/applyInfo/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await applicantsCollection.findOne(query);
      res.send(result);
    });

    app.put("/update-applyInfo/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const applyData = req.body;

      const updated = {
        $set: applyData,
      };

      const options = { upsert: true };

      const result = await applicantsCollection.updateOne(
        query,
        updated,
        options
      );
      res.send(result);
    });

    app.delete("/applyInfo/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await applicantsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/postedMarathon/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await marathonsCollection.findOne(query);
      res.send(result);
    });

    app.put("/update-marathonInfo/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const marathonData = req.body;

      const updated = {
        $set: marathonData,
      };

      const options = { upsert: true };

      const result = await marathonsCollection.updateOne(
        query,
        updated,
        options
      );
      res.send(result);
    });

    app.delete("/postedMarathon/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await marathonsCollection.deleteOne(query);
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Simple CRUD is running on port ${port}`);
});
