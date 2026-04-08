package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.request.BookConsultationRequest;
import com.qualscore.qualcore.dto.response.BookConsultationResponse;

public interface BookingService {

    BookConsultationResponse bookConsultation(BookConsultationRequest request);
}
