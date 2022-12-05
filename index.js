const express = require('express');
const { MongoClient } = require('mongodb')
const ObjectId = require('mongodb').ObjectId;
const app = express();
const port = process.env.PORT || 5000;
const hostname = "0.0.0.0"
const cors = require('cors');
const admin = require("firebase-admin");
const stripe = require('stripe')('sk_test_51JwnGrLiLwVG3jO0cewKLOH7opNVle1UFZap9o05XufrjqX5BkOgl5kZrl8YEepiB5IbPF0JSObI8gPt7FCwKRf200aJzI14tq');
require('dotenv').config();

//midddleware
app.use(cors())
app.use(express.json())

//conneting mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lyhqa.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri)



const serviceAccount = require("./education-project-728a8-firebase-adminsdk-zgb4r-a3029f6676.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch {

        }
    }
    next()
}

async function run() {
    try {
        await client.connect()

        //datacollectin on mongobd
        const database = client.db('food_shop');
        const courseCollection = database.collection('foods');
        const orderCollection = database.collection('orders');

        app.get('/courses', async (req, res) => {
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const cursor = courseCollection.find();
            const count = await cursor.count();
            let result;
            if (page) {
                result = await cursor.skip(size * page).limit(size).toArray()
            }
            else {
                result = await cursor.toArray();
            }
            res.json({ count, result })
        })

        app.get('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await courseCollection.findOne(filter);
            res.json(result)
        })


        //orders
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.json(result)
        })


        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = orderCollection.find(query);
            const result = await cursor.toArray();
            res.json(result)
            // if (req.decodedUserEmail === email) {

            // }
            // else {
            //     res.status(401).json({ message: 'User not authorized' })
            // }
        })

        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.json(result)
        })

        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const query = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    payment: payment
                }
            }
            const result = await orderCollection.updateOne(query, updateDoc);
            res.json(result)
        })

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.json(result)
        })

        //create payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const payment = req.body;
            const amount = payment.price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                automatic_payment_methods: {
                    enabled: true,
                }
            })

            res.json({ clientSecret: paymentIntent.client_secret })
        })


    }
    finally {
        // await client.close()
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Organic Food Server')
})

app.listen(port, () => {
    console.log(`Running ${hostname} at ${port}`)
})