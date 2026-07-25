# Person 4: n8n Workflow Evidence Guide

This guide outlines the steps to connect the application to a live n8n instance and gather evidence that the integration is working correctly. This fulfills the "Real n8n workflow activation/evidence" and "External workflow proof" requirements.

## 1. Set up your n8n Workflow

1.  **Import Workflow**: In your n8n instance, import the `settlement-reconciliation-workflow.json` file from the `n8n/` directory.
2.  **Get Webhook URL**: The workflow should start with a "Webhook" node.
    *   Click on the Webhook node to open its settings.
    *   Under "Webhook URLs", copy the **Test URL**. You will use this for initial testing. Once you activate the workflow, you can switch to the **Production URL**.
3.  **Get API Key**:
    *   In n8n, go to `Settings -> API`.
    *   Create a new API key if you don't have one.
    *   Copy this key.

## 2. Configure Environment Variables

Open your `.env` file and set the following variables with the values from n8n:

```env
# The full Test or Production URL from the n8n Webhook node
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook-test/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# The API key you created in n8n
N8N_API_KEY=your-n8n-api-key-here
```

## 3. Trigger the Workflow from the Application

The workflow is triggered automatically when a payment is successfully verified and confirmed. This happens in `controllers/webhookController.js` inside the `triggerSettlement` method, which calls `n8nService.js`.

To test this:
1.  Run the application (`npm run dev`).
2.  Create an invoice and pay it using the MetaMask checkout flow.
3.  The Alchemy webhook will notify your application, which will then verify the payment.
4.  Once enough confirmations are met, the `paymentVerificationService` will return a success state, and the `webhookController` will call `n8nService.triggerWorkflow`.

## 4. Gather Evidence

You need to prove that the communication happened.

1.  **Application Log Screenshot**:
    *   After a payment is confirmed, look for a log message in your application's console similar to this:
    *   `info: Settlement workflow triggered {"payment_id":123,"mode":"n8n-webhook"}`
    *   Take a screenshot of this log message. This proves the application *sent* the data.
2.  **n8n Execution Log Screenshot**:
    *   In your n8n instance, go to `Executions`.
    *   You should see a new successful execution for your settlement workflow.
    *   Click on it and take a screenshot showing the data received by the Webhook node. This proves n8n *received* the correct data.

Combine these two screenshots as your evidence for this task.