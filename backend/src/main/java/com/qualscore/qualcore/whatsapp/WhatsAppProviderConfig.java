package com.qualscore.qualcore.whatsapp;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Retains @EnableConfigurationProperties binding for WhatsAppProperties (env-var fallback).
 * Active provider selection is now handled by DynamicWhatsAppProvider at call time.
 */
@Configuration
@EnableConfigurationProperties(WhatsAppProperties.class)
public class WhatsAppProviderConfig {
}
