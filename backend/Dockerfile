# =============================================================================
# Stage 1: Build
# Uses the official Maven + Eclipse Temurin 21 Alpine image.
# Alpine keeps the builder small; Maven handles dependency caching.
# =============================================================================
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build

WORKDIR /workspace

# Copy the POM first and pre-download all dependencies.
# This layer is cached by Docker and only re-runs when pom.xml changes,
# which significantly speeds up subsequent builds.
COPY pom.xml .
RUN mvn -q dependency:go-offline -B

# Copy application source and build the fat JAR.
# Tests are skipped here; run them in CI before building the image.
COPY src ./src
RUN mvn -q -DskipTests clean package -B

# =============================================================================
# Stage 2: Runtime
# Uses only the JRE (not the full JDK) on Alpine for a minimal final image.
# The builder image is discarded — only the compiled JAR is carried over.
# =============================================================================
FROM eclipse-temurin:21-jre-alpine

# Create a non-root system user and group to run the application.
# Running as root inside a container is a security risk.
RUN addgroup -S qualcore && adduser -S qualcore -G qualcore

WORKDIR /app

# Copy only the compiled fat JAR from the build stage.
COPY --from=build /workspace/target/*.jar app.jar

# Ensure the non-root user owns the application directory.
RUN chown -R qualcore:qualcore /app

# Switch to the non-root user for all subsequent commands.
USER qualcore

# =============================================================================
# Runtime configuration
# =============================================================================

# Activate the production Spring profile.
ENV SPRING_PROFILES_ACTIVE=prod

# Default port — Render overrides this with its own PORT environment variable.
ENV PORT=8080

# JVM tuning flags:
#   -XX:+UseContainerSupport        — honours cgroup CPU/memory limits
#   -XX:MaxRAMPercentage=75         — use up to 75% of container RAM for heap
#   -Xms128m                        — low initial heap to allow fast cold starts
#   -Djava.security.egd=...         — faster SecureRandom on Linux (avoids /dev/random blocking)
ENV JAVA_OPTS="-Xms128m -XX:+UseContainerSupport -XX:MaxRAMPercentage=75 -Djava.security.egd=file:/dev/./urandom"

# Inform Docker/Render which port the process listens on.
# The actual port is driven by $PORT at runtime, not this declaration.
EXPOSE 8080

# Lightweight health check that hits the root /health endpoint.
# start-period=120s gives the JVM and Flyway migrations time to complete
# before the probe counts failures.
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:${PORT}/health || exit 1

# Run the fat JAR.
# --server.port=${PORT} ensures the Spring server binds to Render's assigned port.
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar --server.port=${PORT}"]
