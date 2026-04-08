package com.qualscore.qualcore.mapper;

import com.qualscore.qualcore.dto.request.CandidateProfileRequest;
import com.qualscore.qualcore.dto.response.CandidateProfileResponse;
import com.qualscore.qualcore.entity.CandidateProfile;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CandidateProfileMapper {

    @BeanMapping(builder = @Builder(disableBuilder = true))
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "candidateCode", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "totalExperienceYears", ignore = true)
    CandidateProfile toEntity(CandidateProfileRequest request);

    CandidateProfileResponse toResponse(CandidateProfile entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "candidateCode", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "totalExperienceYears", ignore = true)
    void updateEntity(CandidateProfileRequest request, @MappingTarget CandidateProfile entity);
}
