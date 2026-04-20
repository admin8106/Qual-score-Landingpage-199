package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.request.CreateCandidateProfileRequest;
import com.qualscore.qualcore.dto.response.CreateCandidateProfileResponse;

public interface CandidateProfileService {

    CreateCandidateProfileResponse createOrUpdate(CreateCandidateProfileRequest request);
}
