package com.qualscore.qualcore.repository;

import com.qualscore.qualcore.entity.EarlyLead;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface EarlyLeadRepository extends JpaRepository<EarlyLead, UUID> {

    Page<EarlyLead> findByCompleteOrderByCreatedAtDesc(boolean complete, Pageable pageable);

    Page<EarlyLead> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
