const express = require('express')
const app = express()
const cors = require('cors')
const { MongoClient } = require("mongodb");
require('dotenv').config();
const admin = require("firebase-admin");
const port = process.env.PORT || 5000;


// doctors-portal-2fa31-firebase-adminsdk.json



const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8yl3g.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;


async function verifyToken(req, res, next) {

    if (req.headers?.authorization?.startsWith('Bearer')) {

        const token = req.headers.authorization.split(' ')[1]

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {


        }


    }

    next()
}





const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());
app.use(express.json());

async function run() {
    try {
        await client.connect();
        const database = client.db('doctors_portal')
        const appoinmentsCollection = database.collection('appointments');
        const usersCollection = database.collection('users');



        app.get('/appointments', async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            // console.log(date)
            const query = { email: email, date: date }
            const cursor = appoinmentsCollection.find(query)
            const appointments = await cursor.toArray();
            res.json(appointments);
        })


        app.post('/appointments', async (req, res) => {
            const appointments = req.body;
            const result = await appoinmentsCollection.insertOne(appointments);
            res.json(result)

        })
        // espical ekjon user er information

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })








        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            // console.log(result)
            res.json(result)


        })

        app.put('/users', async (req, res) => {
            const user = req.body;
            // console.log(user)

            const filter = { email: user.email };
            const options = { upsert: true };

            const updateDoc = { $set: user }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            // console.log(result)
            res.json(result)

        })

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })





    } finally {

        // await client.close();
    }
}


run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening at `, port)
})