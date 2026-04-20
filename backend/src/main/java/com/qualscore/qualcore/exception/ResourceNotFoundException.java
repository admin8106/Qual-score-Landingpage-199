package com.qualscore.qualcore.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends BusinessException {

    public ResourceNotFoundException(String resource, String identifier) {
        super(
                "RESOURCE_NOT_FOUND",
                resource + " not found with identifier: " + identifier,
                HttpStatus.NOT_FOUND
        );
    }
}
