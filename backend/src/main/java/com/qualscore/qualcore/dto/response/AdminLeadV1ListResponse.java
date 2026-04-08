package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Paginated admin leads list response for GET /api/v1/admin/leads.
 */
@Data
@Builder
public class AdminLeadV1ListResponse {

    private List<AdminLeadV1Record> leads;
    private long total;
    private boolean hasMore;
    private String fetchedAt;
}
