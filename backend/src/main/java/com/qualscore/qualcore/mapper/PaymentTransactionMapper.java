package com.qualscore.qualcore.mapper;

import com.qualscore.qualcore.dto.response.PaymentTransactionResponse;
import com.qualscore.qualcore.entity.PaymentTransaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PaymentTransactionMapper {

    @Mapping(target = "amountPaise", expression = "java(entity.getAmount() != null ? entity.getAmount().movePointRight(2).intValue() : null)")
    PaymentTransactionResponse toResponse(PaymentTransaction entity);
}
