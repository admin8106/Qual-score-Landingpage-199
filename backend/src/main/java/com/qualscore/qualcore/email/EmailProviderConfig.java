package com.qualscore.qualcore.email;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Retains @EnableConfigurationProperties binding for EmailProperties (env-var fallback).
 * Active provider selection is now handled by DynamicEmailProvider at call time.
 */
@Configuration
@EnableConfigurationProperties(EmailProperties.class)
public class EmailProviderConfig {
}
