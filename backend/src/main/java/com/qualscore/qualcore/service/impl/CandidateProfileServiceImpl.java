package com.qualscore.qualcore.service.impl;

import com.qualscore.qualcore.dto.request.CreateCandidateProfileRequest;
import com.qualscore.qualcore.dto.response.CreateCandidateProfileResponse;
import com.qualscore.qualcore.entity.CandidateProfile;
import com.qualscore.qualcore.entity.PaymentTransaction;
import com.qualscore.qualcore.enums.PaymentTransactionStatus;
import com.qualscore.qualcore.exception.BusinessException;
import com.qualscore.qualcore.repository.CandidateProfileRepository;
import com.qualscore.qualcore.repository.PaymentTransactionRepository;
import com.qualscore.qualcore.service.CandidateProfileService;
import com.qualscore.qualcore.validation.LinkedInUrlValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CandidateProfileServiceImpl implements CandidateProfileService {

    private final CandidateProfileRepository candidateProfileRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;

    @Override
    @Transactional
    public CreateCandidateProfileResponse createOrUpdate(CreateCandidateProfileRequest request) {
        PaymentTransaction payment = paymentTransactionRepository
                .findByPaymentReference(request.getPaymentReference())
                .orElseThrow(() -> new BusinessException(
                        "PAYMENT_NOT_FOUND",
                        "No payment record found for reference: " + request.getPaymentReference(),
                        HttpStatus.NOT_FOUND));

        if (payment.getStatus() != PaymentTransactionStatus.VERIFIED) {
            throw new BusinessException(
                    "PAYMENT_NOT_VERIFIED",
                    "Payment must be verified before creating a candidate profile. Current status: " + payment.getStatus(),
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        CandidateProfile profile = candidateProfileRepository
                .findByEmail(request.getEmail())
                .orElse(null);

        if (profile == null) {
            String candidateCode = generateCandidateCode();
            while (candidateProfileRepository.existsByCandidateCode(candidateCode)) {
                candidateCode = generateCandidateCode();
            }
            profile = CandidateProfile.builder()
                    .candidateCode(candidateCode)
                    .fullName(request.getFullName())
                    .email(request.getEmail())
                    .mobileNumber(request.getMobileNumber())
                    .location(request.getLocation())
                    .currentRole(request.getCurrentRole())
                    .careerStage(request.getCareerStage())
                    .industry(request.getIndustry())
                    .linkedinUrl(LinkedInUrlValidator.normalize(request.getLinkedinUrl()))
                    .linkedinAboutText(request.getLinkedinAboutText())
                    .linkedinExperienceText(request.getLinkedinExperienceText())
                    .build();
            log.info("Creating new candidate profile: email={}, code={}, hasLinkedinText={}",
                    request.getEmail(), candidateCode, request.getLinkedinAboutText() != null);
        } else {
            profile.setFullName(request.getFullName());
            profile.setMobileNumber(request.getMobileNumber());
            profile.setLocation(request.getLocation());
            profile.setCurrentRole(request.getCurrentRole());
            profile.setCareerStage(request.getCareerStage());
            profile.setIndustry(request.getIndustry());
            if (request.getLinkedinUrl() != null) {
                profile.setLinkedinUrl(LinkedInUrlValidator.normalize(request.getLinkedinUrl()));
            }
            if (request.getLinkedinAboutText() != null) {
                profile.setLinkedinAboutText(request.getLinkedinAboutText());
            }
            if (request.getLinkedinExperienceText() != null) {
                profile.setLinkedinExperienceText(request.getLinkedinExperienceText());
            }
            log.info("Updating existing candidate profile: email={}, code={}, hasLinkedinText={}",
                    request.getEmail(), profile.getCandidateCode(), request.getLinkedinAboutText() != null);
        }

        profile = candidateProfileRepository.save(profile);

        payment.setCandidateProfile(profile);
        paymentTransactionRepository.save(payment);

        return CreateCandidateProfileResponse.builder()
                .candidateCode(profile.getCandidateCode())
                .fullName(profile.getFullName())
                .email(profile.getEmail())
                .careerStage(profile.getCareerStage())
                .industry(profile.getIndustry())
                .linkedinUrl(profile.getLinkedinUrl())
                .createdAt(OffsetDateTime.now().toString())
                .build();
    }

    private String generateCandidateCode() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        return "QS-" + suffix;
    }
}
