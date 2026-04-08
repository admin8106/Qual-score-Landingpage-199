package com.qualscore.qualcore.controller;

import com.qualscore.qualcore.dto.request.InitiatePaymentRequest;
import com.qualscore.qualcore.dto.request.VerifyPaymentRequest;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.InitiatePaymentResponse;
import com.qualscore.qualcore.dto.response.VerifyPaymentResponse;
import com.qualscore.qualcore.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@Tag(name = "Payment", description = "Payment initiation and verification")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/initiate")
    @Operation(summary = "Initiate payment", description = "Creates a payment order via the configured gateway")
    public ResponseEntity<ApiResponse<InitiatePaymentResponse>> initiatePayment(
            @Valid @RequestBody InitiatePaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.initiatePayment(request)));
    }

    @PostMapping("/verify")
    @Operation(summary = "Verify payment", description = "Verifies HMAC signature of completed payment")
    public ResponseEntity<ApiResponse<VerifyPaymentResponse>> verifyPayment(
            @Valid @RequestBody VerifyPaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.verifyPayment(request)));
    }
}
