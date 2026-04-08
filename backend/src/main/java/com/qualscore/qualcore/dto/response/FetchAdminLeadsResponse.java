package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FetchAdminLeadsResponse {
    private List<AdminLeadRecord> leads;
    private Long total;
    private boolean hasMore;
    private String fetchedAt;
}
