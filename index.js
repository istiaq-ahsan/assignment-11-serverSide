const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();
require('dotenv').config()

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1pvay.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const db = client.db('sprint-db')
        const marathonsCollection = db.collection('marathons')
        const applicantsCollection = db.collection('applicants')

        app.post('/add-marathon', async (req, res) => {
            const marathonData = req.body;
            const result = await marathonsCollection.insertOne(marathonData);
            res.send(result);
        })

        app.get('/all-marathons', async (req, res) => {
            const result = await marathonsCollection.find().toArray()
            res.send(result);
        })

        app.get('/marathon-details/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await marathonsCollection.findOne(query)
            res.send(result);
        })

        app.post('/marathon-reg', async (req, res) => {
            const regData = req.body;

            const query = { email: regData.email, marathonId: regData.marathonId }

            const alreadyExist = await applicantsCollection.findOne(query)
            if (alreadyExist) {
                return res.status(400).send('you have already add this marathon');
            }

            const result = await applicantsCollection.insertOne(regData)

            const filter = { _id: new ObjectId(regData.marathonId) }
            const update = {
                $inc: { reg_count: 1 },
            }
            const updatedRegCount = await marathonsCollection.updateOne(filter, update)

            res.send(result);
        })

        app.get('/my-marathons/:email', async (req, res) => {
            const email = req.params.email
            const query = { 'creator.email': email }

            const sort = req.query.sort

            let options = {}

            if (sort) options = { sort: { createdAt: sort === 'asc' ? 1 : -1 } }


            const result = await marathonsCollection.find(query, options).toArray()
            res.send(result);
        })

        app.get('/my-apply/:email', async (req, res) => {
            const email = req.params.email;
            const search = req.query.search

            const query = {
                $and: [
                    { email: email },
                    {
                        title: {
                            $regex: search,
                            $options: 'i',
                        }
                    }
                ]
            }


            const result = await applicantsCollection.find(query).toArray()
            res.send(result);

        })

        app.get('/applyInfo/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await applicantsCollection.findOne(query)
            res.send(result);

        })

        app.put('/update-applyInfo/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const applyData = req.body

            const updated = {
                $set: applyData
            }

            const options = { upsert: true }

            const result = await applicantsCollection.updateOne(query, updated, options)
            res.send(result);

        })

        app.delete('/applyInfo/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await applicantsCollection.deleteOne(query)
            res.send(result);
        })

        app.get('/postedMarathon/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await marathonsCollection.findOne(query)
            res.send(result);

        })

        app.put('/update-marathonInfo/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const marathonData = req.body

            const updated = {
                $set: marathonData
            }

            const options = { upsert: true }

            const result = await marathonsCollection.updateOne(query, updated, options)
            res.send(result);

        })


        app.delete('/postedMarathon/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await marathonsCollection.deleteOne(query)
            res.send(result);
        })

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World')
})

app.listen(port, () => {
    console.log(`Simple CRUD is running on port ${port}`);
})