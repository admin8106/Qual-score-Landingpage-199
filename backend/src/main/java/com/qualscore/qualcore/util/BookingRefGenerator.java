package com.qualscore.qualcore.util;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class BookingRefGenerator {

    private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int REF_LENGTH = 6;
    private static final String PREFIX = "QS-";
    private final SecureRandom random = new SecureRandom();

    public String generate() {
        StringBuilder sb = new StringBuilder(PREFIX);
        for (int i = 0; i < REF_LENGTH; i++) {
            sb.append(CHARS.charAt(random.nextInt(CHARS.length())));
        }
        return sb.toString();
    }
}
