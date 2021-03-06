//require files   // git push heroku main
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const nodemailer = require('nodemailer');
// const sgTransport = require('nodemailer-sendgrid-transport');

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

// connect to mongo
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@doctors-portal.mmfug.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// jwt verification
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}

// const options = {
//     auth: {
//         api_key: process.env.EMAIL_SENDER_KEY
//     }
// }

// const emailClient = nodemailer.createTransport(sgTransport(options));

// email on booking
/* function sendAppointmentEmail(booking){
        const {treatment, patient, patientEmail, date, slot} = booking;

        const email = {
            from: process.env.EMAIL_SENDER,
            to: patientEmail,
            subject: `Your Appoint for ${treatement}`,
            text: `Your Appoint for ${treatement}`,
            html: `<div>
                <h1>Hello ${patient}</h1>
                <h3>Your Appoint for ${treatement}</h3>
                <p>the date ${date} on the ${slot} time</p>
            </div>`,
        };

        emailClient.sendMail(email, function(err, info){
            if(err){
                console.log(err)
            }else{
                 console.log('sent')
            }
        })
} */

async function run() {
    try {

        //connect to mongodb collection
        await client.connect();
        const serviceCollection = client.db("doctors_portal").collection("services");
        const bookingCollection = client.db("doctors_portal").collection("bookings");
        const userCollection = client.db("doctors_portal").collection("users");
        const doctorCollection = client.db("doctors_portal").collection("doctors");
        const paymentCollection = client.db("doctors_portal").collection("payments");

        // verify a admin
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAcc = await userCollection.findOne({ email: requester });

            if (requesterAcc.role === 'admin') {
                next();
            }else{
                return res.status(403).send({ message: 'forbidden' });
            }
        }

        // api homepage
        app.get('/', (req, res) => {
            res.send('Doctors Portal Server Is Ready')
        })

        // get all users
        app.get('/users', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        // get user role by email
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({email: email});
            const isAdmin = user.role === 'admin';
            res.send({admin: isAdmin});
        })

        // users set roles
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };

            const updateDoc = {
                $set: { role: 'admin' },
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            return res.send(result);

        })

        // users
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body
            const filter = { email: email };
            const options = { upsert: true };

            const updateDoc = {
                $set: user,
            }

            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' });
            res.send({ result, token });
        })

        // get services
        app.get('/services', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query).project({name: 1});
            const services = await cursor.toArray();
            res.send(services);
        })

        // get available slots
        app.get('/available', async (req, res) => {
            const date = req.query.date;
            const query = { date: date };

            // get all service
            const services = await serviceCollection.find().toArray();
            // get bookings of the day
            const bookings = await bookingCollection.find(query).toArray();

            services.forEach(service => {
                // get bookings by service in array
                const serviceBookings = bookings.filter(b => b.treatment === service.name);

                // getting all the booked slot in array
                const bookedSlots = serviceBookings.map(s => s.slot);

                //getting available slots array
                const available = service.slots.filter(s => !bookedSlots.includes(s));
                service.slots = available;
            })

            res.send(services);
        })

        // get bookings by id
        app.get('/booking/:appointmentId', async (req, res) => {
            const appointmentId = req.params.appointmentId;
            const query = { _id: ObjectId(appointmentId) };
            const booking = await bookingCollection.findOne(query);
            return res.send(booking);

        })
        // get bookings by email
        app.get('/bookings', verifyJWT, async (req, res) => {
            const patientEmail = req.query.patientEmail;
            const decodedEmail = req.decoded.email;

            if (patientEmail === decodedEmail) {
                const query = { patientEmail: patientEmail };
                const bookings = await bookingCollection.find(query).toArray();
                return res.send(bookings);
            } else {
                return res.status(403).send({ message: 'forbidden access' });
            }
        })

        // post booking
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = { treatment: booking.treatment, date: booking.date, patientEmail: booking.patientEmail }

            const exists = await bookingCollection.findOne(query);

            if (exists) {
                return res.send({ success: false, booking: exists })
            } else {
                const result = await bookingCollection.insertOne(booking);
                // sendAppointmentEmail(booking);
                return res.send({ success: true, result });
            }
        })

        // add doctor
        app.post('/doctor', verifyJWT, verifyAdmin, async (req, res) => {
            const doctor = req.body;
            const result = await doctorCollection.insertOne(doctor);
            return res.send(result);
        })

        app.patch('/boooking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const result = await paymentCollection.insertOne(payment);
            const updatedBooking = await bookingCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc);
        })

        // get doctors
        app.get('/doctor', verifyJWT, verifyAdmin, async (req, res) => {
            const doctors = await doctorCollection.find().toArray();
            res.send(doctors);
        })

        // delete doctor
        app.delete('/doctor/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = {email: email}
            const result = await doctorCollection.deleteOne(filter);
            res.send(result);
        })


        // api homepage
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price*100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd', 
                payment_method_types: ['card'] 
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        })

    } finally {

    }
}

run().catch(console.dir);

// port listening
app.listen(port, () => {
    console.log('Listening to port, ', port);
})