# Outbound Telephony Integration Guide: LiveKit & Telnyx

This guide outlines the system architecture, portal configuration, and code integration required to enable outbound AI voice calls using your existing LiveKit Agent and Telnyx.

---

## 1. Telnyx Freemium Account Check & Limitations

Your current Telnyx account is **Freemium** with **$23.00** in AI credits.

*   **Is it supported?** Yes! You can configure SIP connections, purchase numbers, and make calls.
*   **The Crucial Limitation:** On a trial/freemium account, Telnyx restricts outbound calling **only to verified numbers** (e.g. the phone number you used to sign up).
*   **To Test:** You must ensure the destination number you are dialing is added and verified in your Telnyx portal under **Account Settings -> Verified Numbers**.
*   **Production Launch:** To dial arbitrary user/customer numbers, you must click **Upgrade** in the Telnyx top-right menu and link a card (usually requires a $10–$20 minimum deposit).

---

## 2. Step 1: Telnyx Portal Configuration

Follow these steps in your [Telnyx Mission Control Portal](https://portal.telnyx.com/):

### A. Create a SIP Connection
1. Navigate to **SIP Trunking** -> **SIP Connections** -> **Create SIP Connection**.
2. Name it `LiveKit Outbound Trunk`.
3. Set **Connection Type** to **Credentials** (Username & Password).
4. Telnyx will generate a username and password. **Copy these down immediately**.
5. Set **IP Address/FQDN** (optional, leave blank if prompted since LiveKit Cloud uses dynamic IPs).

### B. Create an Outbound Voice Profile
1. Navigate to **SIP Trunking** -> **Outbound Voice Profiles** -> **Create Profile**.
2. Name it `LiveKit Outbound Profile`.
3. Associate it with the SIP Connection you created in step A.
4. Under **Traffic Allowed**, search and enable destinations you plan to call (e.g. Nigeria `+234`, US `+1`, etc.). *If not enabled, Telnyx will reject the calls.*

### C. Assign your Phone Number
1. Navigate to **Numbers** -> **My Numbers**.
2. Find your number (`+1-551-366-0235`).
3. Under **Connection/App**, assign it to your newly created `LiveKit Outbound Trunk` SIP Connection.

---

## 3. Step 2: LiveKit CLI Configuration (Trunk Creation)

You need to tell LiveKit about your Telnyx SIP Trunk. We will use the LiveKit CLI tool (`lk`).

### A. Create `outbound-trunk.json`
Save the following configuration as a file named `outbound-trunk.json` in your repository root:

```json
{
  "trunk": {
    "name": "Telnyx Outbound Trunk",
    "address": "sip.telnyx.com",
    "numbers": ["+15513660235"],
    "auth_username": "<YOUR_TELNYX_SIP_CONNECTION_USERNAME>",
    "auth_password": "<YOUR_TELNYX_SIP_CONNECTION_PASSWORD>"
  }
}
```
*Replace `<YOUR_TELNYX_SIP_CONNECTION_USERNAME>` and `<YOUR_TELNYX_SIP_CONNECTION_PASSWORD>` with the credentials from Step 1A.*

### B. Register the Trunk via CLI
Run the following command in your terminal:
```bash
lk sip outbound create outbound-trunk.json
```
This will output a **`SIP Trunk ID`** (e.g. `ST_xxxxxxxxxxxx`). **Copy this ID; you will need it for the backend code.**

---

## 4. Step 3: Backend Gateway Integration (Node.js)

To trigger outbound calls programmatically when a user clicks a button, we will add a new endpoint to your Express gateway (`backend-node`).

### A. Add Environment Variables
Add these to your [backend-node/.env](file:///c:/Users/HomePC/Documents/GitHub/hackathon/ConvergsAI-Hackathon/backend-node/.env):
```env
LIVEKIT_SIP_TRUNK_ID=ST_xxxxxxxxxxxx
TELNYX_SIP_USERNAME=<YOUR_TELNYX_SIP_CONNECTION_USERNAME>
```

### B. Implement the Outbound Endpoint in Express
Add the following endpoint to your [backend-node/server.js](file:///c:/Users/HomePC/Documents/GitHub/hackathon/ConvergsAI-Hackathon/backend-node/server.js):

```javascript
const { SipClient } = require('livekit-server-sdk');

// Initialize the LiveKit SIP Client
const sipClient = new SipClient(
  process.env.LIVEKIT_URL,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

/**
 * Endpoint to trigger an outbound AI call
 * POST /api/outbound/call
 */
app.post('/api/outbound/call', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'phoneNumber is required' });
    }

    // Generate a unique room name for this call session
    const roomName = `call_${uuidv4().slice(0, 8)}`;
    const sipTrunkId = process.env.LIVEKIT_SIP_TRUNK_ID;
    const telnyxUsername = process.env.TELNYX_SIP_USERNAME;

    console.log(`[Telephony] Initiating outbound call to ${phoneNumber} in room ${roomName}`);

    // Place the outbound call
    const sipParticipant = await sipClient.createSipParticipant(
      sipTrunkId,
      phoneNumber,
      roomName,
      {
        participantIdentity: `phone_user_${uuidv4().slice(0, 8)}`,
        participantName: 'Customer',
        playDialtone: true,
        // Crucial: Pass the X-Telnyx-Username header so Telnyx maps it to your account
        headers: {
          'X-Telnyx-Username': telnyxUsername
        }
      }
    );

    res.json({
      success: true,
      message: 'Outbound call initiated',
      roomName: roomName,
      sipParticipantId: sipParticipant.sipParticipantId
    });

  } catch (error) {
    console.error('[Telephony] Outbound call failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate outbound call',
      details: error.message
    });
  }
});
```

---

## 5. Step 4: Outbound Call Routing to your Python Agent

When the SIP participant answers the call and enters the room (`roomName`), your python voice worker needs to automatically join and handle the conversation.

Because your agent is registered on LiveKit Cloud, it listens to the room event dispatch:
1. When `createSipParticipant` successfully connects, LiveKit creates the room (`call_xxxxxxxx`).
2. LiveKit sends a room session request to your python agent server.
3. Your python worker (`app.worker`) automatically picks up the job, enters the room, and starts speaking.
4. No additional Python code is required! Your existing voice worker will talk to the phone participant just like it does in the browser.

---

## 6. Verification / Manual Testing Plan

### A. Testing outbound calling directly via CLI
You can test the setup instantly without writing code by creating a `sip-participant.json` file:
```json
{
  "sip_trunk_id": "ST_xxxxxxxxxxxx",
  "sip_call_to": "+1XXXXXXXXXX",
  "room_name": "test-telephony-room",
  "participant_identity": "test-phone-customer",
  "participant_name": "Phone Customer",
  "headers": {
    "X-Telnyx-Username": "<YOUR_TELNYX_SIP_CONNECTION_USERNAME>"
  }
}
```
*Note: Set `sip_call_to` to your verified mobile number.*

Run the CLI command:
```bash
lk sip participant create sip-participant.json
```
Your phone should ring. Once you pick up, your local or deployed python agent worker will connect to `test-telephony-room` and begin talking to you!
