package com.qualscore.qualcore.service;

import com.qualscore.qualcore.dto.request.AdminLoginRequest;
import com.qualscore.qualcore.dto.response.AdminLoginResponse;
import com.qualscore.qualcore.dto.response.AdminProfileResponse;

public interface AdminAuthService {

    AdminLoginResponse login(AdminLoginRequest request);

    AdminProfileResponse getProfile(String email);

    void seedAdminIfNeeded(String email, String rawPassword, String fullName);
}
