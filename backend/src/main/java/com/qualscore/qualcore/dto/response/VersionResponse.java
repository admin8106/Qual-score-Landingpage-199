package com.qualscore.qualcore.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VersionResponse {
    private String name;
    private String version;
    private String environment;
    private String buildTime;
    private String javaVersion;
}
