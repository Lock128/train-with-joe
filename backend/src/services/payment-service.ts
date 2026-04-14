import Stripe from 'stripe';
import { SubscriptionRepository } from '../repositories/subscription-repository';
import type { Subscription } from '../model/domain/Subscription';
import { SubscriptionStatus, PaymentProvider } from '../model/domain/User';
import { PricingService } from './pricing-service';

/**
 * Payment service for handling multi-provider payment processing
 * Supports Stripe (web), App Store (iOS), and Play Store (Android)
 */
export class PaymentService {
  private static instance: PaymentService;
  private stripe: Stripe | null = null;
  private webhookSecret: string = '';
  private subscriptionRepository: SubscriptionRepository;

  private constructor() {
    this.subscriptionRepository = SubscriptionRepository.getInstance();
  }

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Initialize Stripe client with configuration
   */
  private async initializeStripe(): Promise<void> {
    if (this.stripe) return;

    // In production, these would come from SSM Parameter Store
    const apiKey = process.env.STRIPE_SECRET_KEY || '';
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (!apiKey) {
      throw new Error('Stripe API key not configured');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  /**
   * Create Stripe Checkout session for web platform
   * Returns a checkout URL that the frontend can redirect to
   */
  async createStripeCheckoutSession(
    userId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
    await this.initializeStripe();

    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: planId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        metadata: {
          userId,
          planId,
        },
        subscription_data: {
          metadata: {
            userId,
            planId,
          },
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
      });

      if (!session.url) {
        throw new Error('Failed to create Stripe checkout session - no URL returned');
      }

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      console.error('Failed to create Stripe checkout session:', error);
      throw new Error(
        `Failed to create Stripe checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create Stripe subscription for web platform
   */
  async createStripeSubscription(userId: string, planId: string): Promise<Subscription> {
    await this.initializeStripe();

    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      // Create or retrieve Stripe customer
      const customer = await this.stripe.customers.create({
        metadata: { userId },
      });

      // Create subscription
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: planId }],
        metadata: { userId, planId },
      });

      // Create subscription record in DynamoDB
      const subscription: Subscription = {
        id: `stripe_${stripeSubscription.id}`,
        userId,
        provider: PaymentProvider.STRIPE,
        status: SubscriptionStatus.ACTIVE,
        planId,
        externalId: stripeSubscription.id,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.subscriptionRepository.create(subscription);

      return subscription;
    } catch (error) {
      console.error('Failed to create Stripe subscription:', error);
      throw new Error(
        `Failed to create Stripe subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Cancel Stripe subscription
   */
  async cancelStripeSubscription(subscriptionId: string): Promise<void> {
    await this.initializeStripe();

    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      // Extract Stripe subscription ID from our subscription ID
      const stripeSubId = subscriptionId.replace('stripe_', '');

      await this.stripe.subscriptions.cancel(stripeSubId);

      // Update subscription status in DynamoDB
      const subscription = await this.subscriptionRepository.getById(subscriptionId);
      if (subscription) {
        await this.subscriptionRepository.update(subscriptionId, {
          status: SubscriptionStatus.CANCELLED,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to cancel Stripe subscription:', error);
      throw new Error(
        `Failed to cancel Stripe subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Validate Stripe webhook signature
   */
  validateStripeWebhook(payload: string, signature: string): boolean {
    if (!this.stripe || !this.webhookSecret) {
      throw new Error('Stripe not initialized');
    }

    try {
      this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch (error) {
      console.error('Invalid Stripe webhook signature:', error);
      return false;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    console.log(`Processing Stripe webhook event: ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`Unhandled Stripe webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error processing Stripe webhook:', error);
      throw new Error(`Failed to process webhook event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate App Store receipt
   */
  async validateAppStoreReceipt(receiptData: string): Promise<{
    valid: boolean;
    subscriptionId?: string;
    productId?: string;
    expiresAt?: string;
    error?: string;
  }> {
    const productionUrl = 'https://buy.itunes.apple.com/verifyReceipt';
    const sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';
    const sharedSecret = process.env.APPSTORE_SHARED_SECRET || '';

    try {
      const payload = {
        'receipt-data': receiptData,
        password: sharedSecret,
      };

      // Try production first
      let response = await fetch(productionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data = await response.json();

      // If status is 21007, receipt is from sandbox
      if (data.status === 21007) {
        response = await fetch(sandboxUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        data = await response.json();
      }

      if (data.status !== 0) {
        return {
          valid: false,
          error: `Receipt validation failed with status: ${data.status}`,
        };
      }

      const latestReceipt = data.latest_receipt_info?.[0];
      if (!latestReceipt) {
        return {
          valid: false,
          error: 'No subscription info found in receipt',
        };
      }

      const expiresDate = new Date(parseInt(latestReceipt.expires_date_ms));
      const isActive = expiresDate > new Date();

      return {
        valid: isActive,
        subscriptionId: latestReceipt.original_transaction_id,
        productId: latestReceipt.product_id,
        expiresAt: expiresDate.toISOString(),
      };
    } catch (error) {
      console.error('App Store receipt validation error:', error);
      return {
        valid: false,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate Play Store receipt
   */
  async validatePlayStoreReceipt(
    purchaseToken: string,
    productId: string,
  ): Promise<{
    valid: boolean;
    subscriptionId?: string;
    expiresAt?: string;
    error?: string;
  }> {
    // In production, this would use Google Play Developer API
    // For now, return a mock implementation
    try {
      // TODO: Implement actual Google Play API validation
      // This requires OAuth2 credentials and the Google Play Developer API client

      console.log('Play Store validation not yet implemented', { purchaseToken, productId });

      return {
        valid: false,
        error: 'Play Store validation not yet implemented',
      };
    } catch (error) {
      console.error('Play Store receipt validation error:', error);
      return {
        valid: false,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle subscription updated event
   */
  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    const userId = stripeSubscription.metadata?.userId;
    if (!userId) {
      console.warn('No userId in subscription metadata');
      return;
    }

    const subscriptionId = `stripe_${stripeSubscription.id}`;
    const status = this.mapStripeStatus(stripeSubscription.status);

    // Check if subscription exists
    const existing = await this.subscriptionRepository.getById(subscriptionId);

    if (existing) {
      await this.subscriptionRepository.update(subscriptionId, {
        status,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Create new subscription
      const subscription: Subscription = {
        id: subscriptionId,
        userId,
        provider: PaymentProvider.STRIPE,
        status,
        planId: stripeSubscription.metadata?.planId || 'unknown',
        externalId: stripeSubscription.id,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.subscriptionRepository.create(subscription);
    }

    // Sync user tier after subscription status change
    await PricingService.getInstance().resolveAndUpdateTier(userId);
  }

  /**
   * Handle subscription deleted event
   */
  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    const userId = stripeSubscription.metadata?.userId;
    const subscriptionId = `stripe_${stripeSubscription.id}`;

    await this.subscriptionRepository.update(subscriptionId, {
      status: SubscriptionStatus.CANCELLED,
      updatedAt: new Date().toISOString(),
    });

    // Sync user tier after subscription cancellation
    if (userId) {
      await PricingService.getInstance().resolveAndUpdateTier(userId);
    }
  }

  /**
   * Handle payment succeeded event
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    const subscriptionId = `stripe_${invoice.subscription}`;

    await this.subscriptionRepository.update(subscriptionId, {
      status: SubscriptionStatus.ACTIVE,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Handle payment failed event
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    const subscriptionId = `stripe_${invoice.subscription}`;

    await this.subscriptionRepository.update(subscriptionId, {
      status: SubscriptionStatus.PAST_DUE,
      updatedAt: new Date().toISOString(),
    });

    // Sync user tier after payment failure (triggers grace period logic)
    const subscription = await this.subscriptionRepository.getById(subscriptionId);
    if (subscription?.userId) {
      await PricingService.getInstance().resolveAndUpdateTier(subscription.userId);
    }
  }

  /**
   * Map Stripe subscription status to our status enum
   */
  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
      case 'trialing':
        return SubscriptionStatus.ACTIVE;
      case 'canceled':
        return SubscriptionStatus.CANCELLED;
      case 'past_due':
      case 'unpaid':
      case 'incomplete':
      case 'incomplete_expired':
        return SubscriptionStatus.PAST_DUE;
      default:
        return SubscriptionStatus.INACTIVE;
    }
  }
}

/**
 * Get singleton instance of PaymentService
 */
export const getPaymentService = (): PaymentService => {
  return PaymentService.getInstance();
};
