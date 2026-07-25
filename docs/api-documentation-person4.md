# Person 4: API Documentation

This document outlines the API endpoints managed by Person 4, primarily related to settlements and internal verification processes.

**Authentication**: All `/api` endpoints for merchants require a valid session cookie obtained through the login flow. The `/internal` endpoint requires an API key.

## Settlements

Base Path: `/settlements`

### List Settlements for Merchant

*   **Endpoint**: `GET /settlements/api`
*   **Description**: Retrieves a list of all settlements for the currently authenticated merchant.
*   **Auth**: `requireAuth`, `requireMerchantRole`
*   **Success Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "settlement_id": 1,
          "merchant_id": 1,
          "payment_id": 1,
          "gross_amount_sgd": "100.00",
          "net_amount_sgd": "98.50",
          "settlement_reference": "SIM-SGD-1678886400000-ABC123",
          "status": "COMPLETED",
          "settled_at": "2023-03-15T12:00:00.000Z",
          "created_at": "2023-03-15T12:00:00.000Z"
        }
      ]
    }
    ```

### Get Settlement Detail

*   **Endpoint**: `GET /settlements/api/:publicId`
*   **Description**: Retrieves details for a single settlement by its public reference ID.
*   **Auth**: `requireAuth`, `requireMerchantRole`
*   **URL Params**:
    *   `publicId` (string, required): The `settlement_reference` of the settlement.
*   **Success Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "settlement_id": 1,
        "merchant_id": 1,
        "payment_id": 1,
        "gross_amount_sgd": "100.00",
        "platform_fee_sgd": "1.00",
        "conversion_fee_sgd": "0.50",
        "net_amount_sgd": "98.50",
        "settlement_reference": "SIM-SGD-1678886400000-ABC123",
        "status": "COMPLETED",
        "settled_at": "2023-03-15T12:00:00.000Z"
      }
    }
    ```

### Manually Create a Settlement

*   **Endpoint**: `POST /settlements`
*   **Description**: Manually triggers the creation of a settlement for a confirmed payment. This is typically handled automatically by the system but can be used for reconciliation.
*   **Auth**: `requireAuth`, `requireMerchantRole`
*   **Body (JSON)**:
    ```json
    {
      "payment_id": 123
    }
    ```
*   **Success Response (201 Created)**: Returns the newly created settlement object.

### Manually Update Settlement Status

*   **Endpoint**: `POST /settlements/:publicId/status`
*   **Description**: Manually updates the status of a settlement. Used for administrative or reconciliation purposes.
*   **Auth**: `requireAuth`, `requireMerchantRole`
*   **Body (JSON)**:
    ```json
    {
      "status": "COMPLETED",
      "failure_reason": null
    }
    ```
*   **Success Response (200 OK)**: Returns the updated settlement object.

## Internal Verification

Base Path: `/internal`

### Trigger Payment Verification

*   **Endpoint**: `POST /internal/payments/verify`
*   **Description**: An internal-only endpoint for an external service (like n8n) to trigger a payment verification check.
*   **Auth**: `verifyInternalApiKey` (checks `x-api-key` header against `INTERNAL_API_KEY` env var).
*   **Body (JSON)**:
    ```json
    {
      "transaction_hash": "0x...",
      "invoice_public_id": "INV-..."
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
        "success": true,
        "status": "CONFIRMED",
        "message": "Payment successfully verified and confirmed",
        "payment": { "...payment object..." }
    }
    ```