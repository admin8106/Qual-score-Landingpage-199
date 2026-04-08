package com.qualscore.qualcore.mapper;

import com.qualscore.qualcore.dto.response.CommunicationEventResponse;
import com.qualscore.qualcore.entity.CommunicationEvent;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CommunicationEventMapper {

    @Mapping(target = "candidateCode", source = "candidateProfile.candidateCode")
    @Mapping(target = "eventType", expression = "java(entity.getEventType() != null ? entity.getEventType().name() : null)")
    @Mapping(target = "channelType", expression = "java(entity.getChannelType() != null ? entity.getChannelType().name() : null)")
    CommunicationEventResponse toResponse(CommunicationEvent entity);
}
