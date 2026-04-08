package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.CommunicationEvent;
import com.qualscore.qualcore.enums.ChannelType;
import com.qualscore.qualcore.enums.DeliveryStatus;
import com.qualscore.qualcore.enums.EventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommunicationEventRepository extends JpaRepository<CommunicationEvent, UUID> {

    List<CommunicationEvent> findByCandidateProfileIdOrderByCreatedAtDesc(UUID candidateProfileId);

    List<CommunicationEvent> findByEventTypeAndDeliveryStatus(EventType eventType, DeliveryStatus deliveryStatus);

    Page<CommunicationEvent> findByDeliveryStatusOrderByCreatedAtDesc(DeliveryStatus deliveryStatus, Pageable pageable);

    long countByChannelTypeAndDeliveryStatus(ChannelType channelType, DeliveryStatus deliveryStatus);

    Optional<CommunicationEvent> findByIdempotencyKey(String idempotencyKey);

    Optional<CommunicationEvent> findByProviderMessageId(String providerMessageId);
}
