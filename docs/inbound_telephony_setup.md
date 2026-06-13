# Inbound Telephony Integration Guide: LiveKit & Telnyx

To bypass the outbound calling restrictions on a Telnyx Freemium account during a hackathon, the most robust and professional architecture is to configure **Inbound Calling**.

Instead of the agent calling the judges, **the judges call your agent directly at `+1-551-366-0235`**.

*   **Why it works on Freemium:** Telnyx does NOT restrict inbound calls. Anyone, anywhere can call your rented phone number, and it will route to your AI agent for free.
*   **Low Friction:** Judges do not need to type their phone numbers on a web form—they simply call the phone number.
*   **Decoupled:** It requires **zero code changes** to your frontend or your Python backend.

---

## 1. Step 1: Telnyx Portal Setup

We must tell Telnyx to route incoming calls to your LiveKit SIP Gateway.

### A. Construct your LiveKit SIP Endpoint URL
1. Find your LiveKit Project ID (from your LiveKit Cloud Console).
2. Remove the `p_` prefix. For example, if your Project ID is `p_vjnxecm0tjk`, your project subdomain is `vjnxecm0tjk`.
3. Your LiveKit SIP Endpoint is:
   `{subdomain}.sip.livekit.cloud` (e.g. `vjnxecm0tjk.sip.livekit.cloud`).

### B. Configure a Telnyx FQDN Connection
1. In the **Telnyx Mission Control Portal**, go to **SIP Trunking** -> **SIP Connections** -> **Create SIP Connection**.
2. Name it `LiveKit Inbound Connection`.
3. Set **Connection Type** to **FQDN**.
4. In the **FQDN** input, paste your LiveKit SIP Endpoint:
   `{subdomain}.sip.livekit.cloud`
5. Save the connection.

### C. Link your Phone Number
1. Go to **Numbers** -> **My Numbers**.
2. Find your rented phone number (`+1-551-366-0235`).
3. Under **Connection/App**, assign it to the newly created `LiveKit Inbound Connection`.

---

## 2. Step 2: LiveKit CLI Configuration (Trunk & Rules)

We must configure LiveKit to accept incoming calls on your Telnyx number and route them to your AI voice agent.

### A. Create `inbound-trunk.json`
Save the following configuration as `inbound-trunk.json` in your repository root:
```json
{
  "trunk": {
    "name": "Telnyx Inbound Trunk",
    "numbers": ["+15513660235"]
  }
}
```
*Note: Make sure the number matches the E.164 format of your Telnyx number.*

Run the CLI command to create the trunk:
```bash
lk sip inbound create inbound-trunk.json
```
This will output an **Inbound Trunk ID** (e.g., `ST_yyyyyyyyyyyy`). Copy it.

### B. Create `dispatch-rule.json`
To route the call to your agent room, create `dispatch-rule.json` in your repository root:
```json
{
  "name": "Telnyx Inbound Dispatch Rule",
  "trunkIds": ["<YOUR_INBOUND_TRUNK_ID>"],
  "rule": {
    "dispatchRuleIndividual": {
      "roomPrefix": "phone_call_",
      "pin": ""
    }
  }
}
```
*Replace `<YOUR_INBOUND_TRUNK_ID>` with the ID generated in step A.*

Run the CLI command to create the dispatch rule:
```bash
lk sip dispatch create dispatch-rule.json
```

---

## 3. How it Works Under the Hood

When a judge dials `+1-551-366-0235`:
1. The call hits Telnyx and is routed to `{subdomain}.sip.livekit.cloud`.
2. LiveKit matches the incoming number `+15513660235` to your Inbound SIP Trunk.
3. The Dispatch Rule runs, generating a new unique room name: `phone_call_<callerNumber>`.
4. LiveKit creates the room and triggers a new session job.
5. Your running Python voice worker (`app.worker`) automatically picks up the job, enters the room, and starts speaking with the caller.
