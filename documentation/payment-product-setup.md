# Payment Product Setup Guide

This guide covers how to create and configure subscription products across all three payment platforms (Stripe, Apple App Store, Google Play Store) and how to wire the resulting product/price IDs into the backend via SSM Parameter Store.

## Pricing Overview

| Tier  | Price    | Billing  | Features                                                  |
|-------|----------|----------|-----------------------------------------------------------|
| Free  | €0       | —        | 5 image scans total, 5 vocabulary lists, AI training      |
| Basic | €2.99/mo | Monthly  | 25 image scans/month, unlimited vocabulary lists, AI training |
| Pro   | €9.99/mo | Monthly  | Unlimited image scans, unlimited vocabulary lists, AI training |

---

## 1. Stripe (Web)

Stripe products and prices have already been created on the "Train with Joe" account. If you need to recreate them or set up a new environment:

### Using the Stripe Dashboard

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click **Add product**
3. Create **Basic Monthly**:
   - Name: `Basic Monthly`
   - Description: `Basic plan - 25 image scans/month, unlimited vocabulary lists, AI training`
   - Pricing: **Recurring**, €2.99, Monthly
4. Create **Pro Monthly**:
   - Name: `Pro Monthly`
   - Description: `Pro plan - Unlimited image scans, unlimited vocabulary lists, AI training`
   - Pricing: **Recurring**, €9.99, Monthly
5. Copy the **Price ID** (starts with `price_`) for each — these go into the SSM config

### Current Price IDs

| Product       | Product ID              | Price ID                              | Amount    |
|---------------|-------------------------|---------------------------------------|-----------|
| Basic Monthly | `prod_ULQaU0s1qUkhuL`   | `price_1TMjma6XJ81FrS4ZxPpE6yr4`      | €2.99/mo  |
| Pro Monthly   | `prod_ULQaLEp8v7Bbb8`   | `price_1TMjmb6XJ81FrS4ZKdv5Site`      | €9.99/mo  |

### Important Notes

- Stripe prices are immutable — to change the amount or currency, create a new price and archive the old one
- The checkout flow passes the price ID directly to `stripe.checkout.sessions.create` as a line item
- Make sure **billing address collection** and **promotion codes** are enabled (already configured in `payment-service.ts`)

---

## 2. Apple App Store (iOS)

App Store subscription products must be created manually in App Store Connect. There is no API for product creation.

### Prerequisites

- An active [Apple Developer Program](https://developer.apple.com/programs/) membership
- Your app registered in [App Store Connect](https://appstoreconnect.apple.com)
- A **Paid Apps agreement** signed in App Store Connect → Agreements, Tax, and Banking

### Steps

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → My Apps → Train with Joe
2. Navigate to the **Subscriptions** tab (under Features or Monetization depending on your view)
3. Create a **Subscription Group** (e.g., `Train with Joe Plans`)
   - All subscription tiers should be in the same group so users can upgrade/downgrade
4. Add the **Basic** subscription:
   - Reference Name: `Basic Monthly`
   - Product ID: `com.trainwithjoe.basic.monthly` (this is the ID you'll use in the SSM config)
   - Subscription Duration: **1 Month**
   - Subscription Price: **€2.99** (Tier appropriate for your target markets)
   - Add a display name and description for each localization (EN, DE)
5. Add the **Pro** subscription:
   - Reference Name: `Pro Monthly`
   - Product ID: `com.trainwithjoe.pro.monthly`
   - Subscription Duration: **1 Month**
   - Subscription Price: **€9.99**
   - Add a display name and description for each localization (EN, DE)
6. Submit the subscriptions for review (they'll be reviewed alongside your next app update)

### App Store Shared Secret

The backend needs a shared secret to validate receipts:

1. In App Store Connect → My Apps → Train with Joe → In-App Purchases → App-Specific Shared Secret
2. Generate or copy the shared secret
3. Store it in SSM or as the `APPSTORE_SHARED_SECRET` environment variable for your Lambda functions

### Product IDs to Use

Use the product IDs you chose in step 4/5 above. Suggested convention:

| Tier  | Product ID                        |
|-------|-----------------------------------|
| Basic | `com.trainwithjoe.basic.monthly`  |
| Pro   | `com.trainwithjoe.pro.monthly`    |

---

## 3. Google Play Store (Android)

Play Store subscription products must be created in the Google Play Console. While there is a Monetization API, the console is simpler for a two-product setup.

### Prerequisites

- A [Google Play Developer account](https://play.google.com/console)
- Your app registered in the Google Play Console
- A published app (at least an internal test track release) — subscriptions can't be created until the app has been uploaded

### Steps

1. Go to [Google Play Console](https://play.google.com/console) → Train with Joe
2. Navigate to **Monetize** → **Subscriptions**
3. Click **Create subscription** for **Basic**:
   - Product ID: `com.trainwithjoe.basic.monthly` (cannot be changed after creation)
   - Name: `Basic Monthly`
4. Add a **Base plan**:
   - Billing period: **1 Month**
   - Price: **€2.99** (set prices per region or use auto-conversion)
   - Auto-renewing: Yes
5. Click **Create subscription** for **Pro**:
   - Product ID: `com.trainwithjoe.pro.monthly`
   - Name: `Pro Monthly`
6. Add a **Base plan**:
   - Billing period: **1 Month**
   - Price: **€9.99**
   - Auto-renewing: Yes
7. Activate both subscriptions

### Service Account for Receipt Validation

The backend needs a service account to validate purchases via the Google Play Developer API:

1. Go to Google Play Console → Setup → API access
2. Link or create a Google Cloud project
3. Create a service account with the **Finance** role
4. Download the JSON key file
5. Store the credentials securely (SSM Parameter Store or Secrets Manager)

### Product IDs to Use

| Tier  | Product ID                        |
|-------|-----------------------------------|
| Basic | `com.trainwithjoe.basic.monthly`  |
| Pro   | `com.trainwithjoe.pro.monthly`    |

---

## 4. Updating SSM Parameter Store

After creating products on all platforms, update the SSM parameter using the provided script:

```bash
APPSTORE_BASIC="com.trainwithjoe.basic.monthly" \
APPSTORE_PRO="com.trainwithjoe.pro.monthly" \
PLAYSTORE_BASIC="com.trainwithjoe.basic.monthly" \
PLAYSTORE_PRO="com.trainwithjoe.pro.monthly" \
./scripts/update-plan-ids.sh <namespace> <region>
```

For example, to update the production environment:

```bash
APPSTORE_BASIC="com.trainwithjoe.basic.monthly" \
APPSTORE_PRO="com.trainwithjoe.pro.monthly" \
PLAYSTORE_BASIC="com.trainwithjoe.basic.monthly" \
PLAYSTORE_PRO="com.trainwithjoe.pro.monthly" \
./scripts/update-plan-ids.sh prod eu-central-1
```

The script will:
- Check the current parameter value
- Skip the update if nothing changed
- Overwrite the parameter with the new JSON config

### Resulting SSM Parameter Value

Path: `/<namespace>/config/plan-ids`

```json
{
  "stripe": {
    "basic": "price_1TMjma6XJ81FrS4ZxPpE6yr4",
    "pro": "price_1TMjmb6XJ81FrS4ZKdv5Site"
  },
  "appStore": {
    "basic": "com.trainwithjoe.basic.monthly",
    "pro": "com.trainwithjoe.pro.monthly"
  },
  "playStore": {
    "basic": "com.trainwithjoe.basic.monthly",
    "pro": "com.trainwithjoe.pro.monthly"
  }
}
```

### Verifying the Config

After updating, you can verify the parameter:

```bash
aws ssm get-parameter \
  --name "/<namespace>/config/plan-ids" \
  --region eu-central-1 \
  --query "Parameter.Value" \
  --output text | python3 -m json.tool
```
