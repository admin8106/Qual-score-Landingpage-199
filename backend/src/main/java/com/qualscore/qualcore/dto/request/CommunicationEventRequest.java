package com.qualscore.qualcore.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;

@Data
public class CommunicationEventRequest {

    private String candidateCode;

    @NotBlank(message = "Event type is required")
    @Size(max = 50, message = "Event type must not exceed 50 characters")
    private String eventType;

    @NotBlank(message = "Channel type is required")
    @Pattern(regexp = "EMAIL|WHATSAPP|SMS|SLACK|CRM|INTERNAL",
             message = "Channel type must be one of: EMAIL, WHATSAPP, SMS, SLACK, CRM, INTERNAL")
    private String channelType;

    @Size(max = 80, message = "Template code must not exceed 80 characters")
    private String templateCode;

    private Map<String, Object> payload;
}
