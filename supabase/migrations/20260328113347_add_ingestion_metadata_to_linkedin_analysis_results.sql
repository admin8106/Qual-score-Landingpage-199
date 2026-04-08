/*
  # Add LinkedIn ingestion metadata to linkedin_analysis_results

  ## Purpose
  Track how the LinkedIn profile data was ingested for each analysis record.
  This enables transparency in the report ("LinkedIn analysis based on form data only")
  and supports future quality filtering by confidence level.

  ## New Columns

  ### ingestion_mode (VARCHAR 30, nullable)
  The ingestion strategy used to collect LinkedIn data.
  Possible values (matches LinkedInIngestionMode enum):
    - 'url_only'        — Only LinkedIn URL was submitted; rule-based from form data
    - 'candidate_text'  — Candidate pasted About and/or experience text
    - 'enriched'        — Full profile fetched from enrichment API (e.g. Proxycurl)
    - 'fallback'        — No LinkedIn data; neutral baseline scores applied

  ### analysis_confidence (VARCHAR 10, nullable)
  How reliable the dimension scores are given the ingestion mode.
  Possible values (matches LinkedInIngestionMode.AnalysisConfidence enum):
    - 'NONE'    — No LinkedIn data available
    - 'LOW'     — URL-only; scores based on form data inference
    - 'MEDIUM'  — Candidate-provided text; partial signals available
    - 'HIGH'    — Full enrichment; all dimensions scored from real data

  ### analysis_coverage (VARCHAR 10, nullable)
  How much of the LinkedIn profile was covered by the ingestion.
  Possible values (matches LinkedInIngestionMode.AnalysisCoverage enum):
    - 'NONE'    — No profile data
    - 'PARTIAL' — Some fields available (URL-only or text paste)
    - 'FULL'    — Complete structured profile data

  ## Notes
  - All three columns are nullable to safely support existing rows
  - Existing rows will have null values — this is expected and acceptable
  - Index on ingestion_mode supports future analytics queries
    ("what % of reports use CANDIDATE_TEXT mode?")
*/

ALTER TABLE linkedin_analysis_results
    ADD COLUMN IF NOT EXISTS ingestion_mode VARCHAR(30),
    ADD COLUMN IF NOT EXISTS analysis_confidence VARCHAR(10),
    ADD COLUMN IF NOT EXISTS analysis_coverage VARCHAR(10);

COMMENT ON COLUMN linkedin_analysis_results.ingestion_mode IS 'Ingestion strategy: url_only | candidate_text | enriched | fallback';
COMMENT ON COLUMN linkedin_analysis_results.analysis_confidence IS 'Scoring confidence level: NONE | LOW | MEDIUM | HIGH';
COMMENT ON COLUMN linkedin_analysis_results.analysis_coverage IS 'Profile data coverage: NONE | PARTIAL | FULL';

CREATE INDEX IF NOT EXISTS idx_lar_ingestion_mode
    ON linkedin_analysis_results (ingestion_mode);
