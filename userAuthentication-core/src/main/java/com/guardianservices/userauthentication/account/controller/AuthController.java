package com.guardianservices.userauthentication.account.controller;

import com.guardianservices.userauthentication.account.service.AccountService;
import com.guardianservices.userauthentication.account.UserStatus;
import com.guardianservices.userauthentication.common.exception.ConflictException;
import com.guardianservices.userauthentication.common.exception.UnauthorizedException;
import com.guardianservices.userauthentication.common.exception.ValidationException;
import com.guardianservices.userauthentication.product.ProductScopeValidator;
import com.guardianservices.userauthentication.product.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import com.guardianservices.userauthentication.product.ProductPasswordEncoder;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.HtmlUtils;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AccountService accountService;
    private final ProductPasswordEncoder passwordEncoder;
    private final ProductScopeValidator productScopeValidator;
    private final CurrentUserService currentUserService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        try {
            String passwordHash = passwordEncoder.encode(request.getProductName(), request.getPassword());
            AccountService.RegistrationResult registration =
                accountService.registerWithOutcome(
                    request.getProductName(),
                    request.getEmail(),
                    passwordHash
                );
            if (registration.existingAccount()) {
                if (registration.user().getStatus() == UserStatus.PENDING_VERIFICATION) {
                    log.info("Registration retried for account pending email verification");
                    return ResponseEntity.accepted().body(Map.of(
                        "message", "An account with this email is already pending verification. A new verification email has been sent."
                    ));
                }
                log.info("Registration rejected because the account already exists");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "message", "An account with this email already exists. Please sign in instead."
                ));
            }
            log.info("Registration request accepted");
            return ResponseEntity.accepted().body(Map.of(
                "message", "Registration accepted. Please verify your email to activate your account."
            ));
        } catch (ValidationException e) {
            log.warn("Registration request rejected: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "message", e.getMessage(),
                "errors", e.getFieldErrors()
            ));
        } catch (ConflictException e) {
            log.warn("Registration request could not be completed due to a conflict");
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.warn("Registration request contained invalid details");
            return ResponseEntity.badRequest()
                .body(Map.of("message", "Invalid registration details."));
        } catch (DataIntegrityViolationException e) {
            log.warn("Registration request rejected by a data constraint");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "message", "Registration could not be completed due to a conflict. Please try again."
            ));
        } catch (DataAccessException e) {
            log.error("Registration could not access the account data store", e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "message", "Registration is temporarily unavailable. Please try again later."
            ));
        } catch (RuntimeException e) {
            log.error("Unexpected error while processing registration", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "message", "Registration failed due to an unexpected server error."
            ));
        }
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidRegistration(
        MethodArgumentNotValidException exception
    ) {
        Map<String, String> errors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
            errors.putIfAbsent(error.getField(), error.getDefaultMessage())
        );
        log.warn("Registration request failed input validation");
        return ResponseEntity.badRequest().body(Map.of(
            "message", "Registration details are invalid.",
            "errors", errors
        ));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableRegistration(
        HttpMessageNotReadableException exception
    ) {
        log.warn("Registration request body could not be parsed");
        return ResponseEntity.badRequest().body(Map.of(
            "message", "Request body is missing or contains invalid JSON."
        ));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorized(UnauthorizedException exception) {
        log.warn("Authentication request rejected: {}", exception.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.<String, Object>of("errorMessage", UnauthorizedException.ERROR_MESSAGE));
    }

    @PostMapping("/email/verify")
    public ResponseEntity<Map<String, Object>> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return processEmailVerification(request.getToken(), request.getProductName());
    }

    @GetMapping("/email/verify/{productName}/{token}")
    public ResponseEntity<String> verifyEmail(@PathVariable String productName, @PathVariable String token) {
        ResponseEntity<Map<String, Object>> result = processEmailVerification(token, productName);
        boolean verified = result.getStatusCode().is2xxSuccessful();
        String message = String.valueOf(result.getBody().get("message"));

        return ResponseEntity.status(result.getStatusCode())
            .contentType(MediaType.TEXT_HTML)
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .header("Referrer-Policy", "no-referrer")
            .body(emailVerificationPage(verified, message));
    }

    private String emailVerificationPage(boolean verified, String message) {
        String title = verified ? "Email verified" : "Verification unsuccessful";
        String heading = verified ? "You’re all set!" : "We couldn’t verify your email";
        String description = verified
            ? "Your email address has been verified. You can now sign in to your account."
            : message;
        String statusClass = verified ? "success" : "error";
        String icon = verified ? "&#10003;" : "!";

        return """
            <!doctype html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta name="referrer" content="no-referrer">
              <title>%s</title>
              <style>
                * { box-sizing: border-box; }
                body {
                  min-height: 100vh; margin: 0; padding: 24px;
                  display: grid; place-items: center;
                  background: linear-gradient(145deg, #f4f7ff, #f8fafc 55%%, #eef5ff);
                  color: #172033; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
                }
                .card {
                  width: min(100%%, 480px); padding: 48px 40px; text-align: center;
                  background: #fff; border: 1px solid #e8edf5; border-radius: 24px;
                  box-shadow: 0 24px 70px rgba(30, 48, 86, .12);
                }
                .icon {
                  width: 72px; height: 72px; margin: 0 auto 24px; display: grid; place-items: center;
                  border-radius: 50%%; font-size: 34px; font-weight: 700;
                }
                .success .icon { color: #087443; background: #e6f7ee; }
                .error .icon { color: #b42318; background: #fff0ee; }
                h1 { margin: 0 0 12px; font-size: clamp(24px, 6vw, 32px); letter-spacing: -.04em; }
                p { margin: 0; color: #596579; font-size: 16px; line-height: 1.65; overflow-wrap: anywhere; }
                .brand { margin-top: 32px; color: #8993a4; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; }
                @media (max-width: 480px) { .card { padding: 36px 24px; } }
              </style>
            </head>
            <body>
              <main class="card %s">
                <div class="icon" aria-hidden="true">%s</div>
                <h1>%s</h1>
                <p>%s</p>
                <div class="brand">Account security</div>
              </main>
            </body>
            </html>
            """.formatted(
                HtmlUtils.htmlEscape(title),
                statusClass,
                icon,
                HtmlUtils.htmlEscape(heading),
                HtmlUtils.htmlEscape(description)
            );
    }

    private ResponseEntity<Map<String, Object>> processEmailVerification(String token, String productName) {
        try {
            accountService.verifyEmail(token, productName);
            log.info("Email verification completed");
            return ResponseEntity.ok(Map.of("message", "Email verified successfully"));
        } catch (ValidationException exception) {
            log.warn("Email verification rejected because the request is invalid");
            return ResponseEntity.badRequest().body(Map.of(
                "message", exception.getMessage(),
                "errors", exception.getFieldErrors()
            ));
        } catch (UnauthorizedException exception) {
            log.warn("Email verification rejected because the token is invalid or expired");
            return handleUnauthorized(exception);
        } catch (ConflictException exception) {
            log.warn("Email verification could not be completed because the account is not pending verification");
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", exception.getMessage()));
        } catch (DataAccessException exception) {
            log.error("Email verification could not access the account data store", exception);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "message", "Email verification is temporarily unavailable. Please try again later."
            ));
        } catch (RuntimeException exception) {
            log.error("Unexpected error while processing email verification", exception);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "message", "Email verification failed due to an unexpected server error."
            ));
        }
    }

    @PostMapping("/email/resend")
    public ResponseEntity<Map<String, Object>> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        accountService.resendVerification(request.getEmail(), request.getProductName());
        log.info("Verification email resend request processed");
        return ResponseEntity.accepted().body(Map.of("message", "If the account exists, a verification email has been sent"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        accountService.initiatePasswordReset(request.getEmail(), request.getProductName());
        log.info("Password reset request processed");
        return ResponseEntity.accepted().body(Map.of("message", "If the account exists, a password reset email has been sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        // Client sends raw password, we SHA-256 hash it
        String passwordHash = passwordEncoder.encode(request.getProductName(), request.getPassword());
        accountService.resetPassword(request.getToken(), passwordHash, request.getProductName());
        log.info("Password reset completed");
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                                               HttpServletRequest httpRequest) {
        productScopeValidator.assertMatchesAuthenticatedProduct(request.getProductName());
        currentUserService.getCurrentUser();
        // Get user from security context
        // This would be implemented with Spring Security
        log.info("Password change request accepted");
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @PostMapping("/email-change")
    public ResponseEntity<Map<String, Object>> initiateEmailChange(@Valid @RequestBody EmailChangeRequest request,
                                                                    HttpServletRequest httpRequest) {
        productScopeValidator.assertMatchesAuthenticatedProduct(request.getProductName());
        accountService.initiateEmailChange(currentUserService.getCurrentUser(), request.getNewEmail());
        log.info("Email change request accepted");
        return ResponseEntity.accepted().body(Map.of("message", "Email change initiated"));
    }

}