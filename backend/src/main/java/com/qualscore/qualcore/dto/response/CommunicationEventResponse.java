package com.qualscore.qualcore.dto.response;

import com.qualscore.qualcore.enums.DeliveryStatus;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class CommunicationEventResponse {

    private UUID id;
    private String candidateCode;
    private String eventType;
    private String channelType;
    private String templateCode;
    private DeliveryStatus deliveryStatus;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
