package com.qualscore.qualcore.controller;

import com.qualscore.qualcore.dto.request.BookConsultationRequest;
import com.qualscore.qualcore.dto.response.ApiResponse;
import com.qualscore.qualcore.dto.response.BookConsultationResponse;
import com.qualscore.qualcore.service.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/booking")
@RequiredArgsConstructor
@Tag(name = "Booking", description = "Consultation booking management")
public class BookingController {

    private final BookingService bookingService;

    @PostMapping("/consultation")
    @Operation(summary = "Book consultation", description = "Books a consultation slot and returns a booking reference")
    public ResponseEntity<ApiResponse<BookConsultationResponse>> bookConsultation(
            @Valid @RequestBody BookConsultationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(bookingService.bookConsultation(request)));
    }
}
