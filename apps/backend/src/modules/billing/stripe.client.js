import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "../../config/env.js";

// Null when the deployment has no Stripe key — every caller checks first.
export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

export default stripe;
