package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ValidationFieldError {

    private String field;
    private Object rejectedValue;
    private String message;
}
