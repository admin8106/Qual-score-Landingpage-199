package com.qualscore.qualcore.payment;

import java.util.Map;

/**
 * Gateway-agnostic order creation request.
 *
 * The implementing client maps this onto provider-specific fields:
 *   Razorpay: amount (paise), currency, receipt, notes
 *   PayU:     txnid, amount, productinfo, firstname, email, phone
 */
public record CreateOrderRequest(
        String internalReference,
        Integer amountPaise,
        String currency,
        String candidateName,
        String candidateEmail,
        String candidatePhone,
        String productDescription,
        Map<String, String> notes
) {}
