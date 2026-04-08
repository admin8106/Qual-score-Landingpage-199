package com.qualscore.qualcore.exception;

import org.springframework.http.HttpStatus;

public class ExternalServiceException extends BusinessException {

    public ExternalServiceException(String service, String message) {
        super("EXTERNAL_SERVICE_ERROR", "[" + service + "] " + message, HttpStatus.BAD_GATEWAY);
    }
}
