import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPaymentService } from '../services/payment-service';

/**
 * AWS Lambda handler for Stripe webhooks
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Stripe webhook received:', {
    headers: event.headers,
    body: event.body ? 'present' : 'missing',
    timestamp: new Date().toISOString(),
    sourceIp: event.requestContext?.identity?.sourceIp,
  });

  try {
    // Validate required data
    if (!event.body) {
      console.error('No body in webhook request');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No body provided' }),
      };
    }

    const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    if (!signature) {
      console.error('No Stripe signature in webhook request');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No Stripe signature provided' }),
      };
    }

    const paymentService = getPaymentService();

    // Validate webhook signature
    if (!paymentService.validateStripeWebhook(event.body, signature)) {
      console.error('Invalid Stripe webhook signature');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    // Parse the webhook event
    let stripeEvent;
    try {
      stripeEvent = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Failed to parse webhook body:', parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    // Process the webhook event
    await paymentService.handleStripeWebhook(stripeEvent);

    console.log(`Successfully processed Stripe webhook event: ${stripeEvent.type}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, webhookEvent: stripeEvent.type }),
    };
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);

    // Extract detailed error information
    const errorDetails =
      error && typeof error === 'object' && 'code' in error
        ? { code: error.code, message: error.message, details: error.details }
        : { message: error instanceof Error ? error.message : 'Unknown error' };

    // Return 500 for processing errors to trigger Stripe retry
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Webhook processing failed',
        ...errorDetails,
      }),
    };
  }
};
