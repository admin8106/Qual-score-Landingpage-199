package com.qualscore.qualcore.mapper;

import com.qualscore.qualcore.dto.request.ConsultationBookingRequest;
import com.qualscore.qualcore.dto.response.ConsultationBookingResponse;
import com.qualscore.qualcore.entity.ConsultationBooking;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ConsultationBookingMapper {

    @BeanMapping(builder = @Builder(disableBuilder = true))
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "candidateProfile", ignore = true)
    @Mapping(target = "bookingStatus", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    ConsultationBooking toEntity(ConsultationBookingRequest request);

    @Mapping(target = "candidateCode", source = "candidateProfile.candidateCode")
    ConsultationBookingResponse toResponse(ConsultationBooking entity);
}
