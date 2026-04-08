package com.qualscore.qualcore.exception;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ApiError {
    private String code;
    private String message;
    private Object details;
}
