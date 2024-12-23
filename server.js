const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

// Utility function to get Access Token
async function getAccessToken() {
    try {
        const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString("base64");
        const response = await axios.get(
            "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            {
                headers: { Authorization: `Basic ${auth}` },
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error fetching access token:", error.response ? error.response.data : error.message);
        throw new Error("Failed to fetch access token");
    }
}

// STK Push Route
app.post("/stkpush", async (req, res) => {
    const { phone, amount } = req.body;

    // Validate phone number and amount
    if (!phone || !amount) {
        return res.status(400).send({ error: "Phone number and amount are required" });
    }

    try {
        // Generate timestamp and password
        const accessToken = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
        const password = Buffer.from(
            `${process.env.BUSINESS_SHORTCODE}${process.env.PASSKEY}${timestamp}`
        ).toString("base64");

        const data = {
            BusinessShortCode: process.env.BUSINESS_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phone,
            PartyB: process.env.BUSINESS_SHORTCODE,
            PhoneNumber: phone,
            CallBackURL: process.env.CALLBACK_URL,
            AccountReference: "TestPayment",
            TransactionDesc: "Test Payment",
        };

        // Send STK Push Request
        const response = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            data,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        res.status(200).send(response.data);
    } catch (error) {
        console.error("Error in STK Push:", error.response ? error.response.data : error.message);
        res.status(500).send(error.response ? error.response.data : { error: "Failed to process STK Push" });
    }
});

// Callback URL Route
app.post("/callback", (req, res) => {
    console.log("Callback Response:", JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
