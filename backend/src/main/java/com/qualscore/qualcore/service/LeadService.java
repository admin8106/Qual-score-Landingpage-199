package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.request.SaveCandidateProfileRequest;
import com.qualscore.qualcore.dto.response.AdminLeadRecord;
import com.qualscore.qualcore.dto.response.FetchAdminLeadsResponse;
import com.qualscore.qualcore.dto.response.SaveCandidateProfileResponse;

import java.util.UUID;

public interface LeadService {

    SaveCandidateProfileResponse saveCandidateProfile(SaveCandidateProfileRequest request);

    AdminLeadRecord getLeadById(UUID leadId);

    FetchAdminLeadsResponse fetchAdminLeads(int limit, int offset, String filter, String search);
}
