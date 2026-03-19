package com.example.trade_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Map;

@Component
public class WalletClient {

    private static final Logger log = LoggerFactory.getLogger(WalletClient.class);

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${portfolio.service.url:http://localhost:8084}")
    private String portfolioServiceUrl;

    /**
     * Deducts amount from the user's wallet.
     * Throws RuntimeException with a user-friendly message if:
     *   - balance is insufficient  (400 from portfolio service)
     *   - portfolio service is down
     * This will block the trade order from being placed.
     */
    public void withdraw(Long userId, BigDecimal amount) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-User-Id", userId.toString());

            Map<String, Object> body = Map.of("amount", amount);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            restTemplate.postForEntity(
                    portfolioServiceUrl + "/api/wallet/withdraw",
                    request,
                    Map.class
            );

            log.info("[WalletClient] Withdrew ₹{} from wallet of user {}", amount, userId);

        } catch (HttpClientErrorException.BadRequest e) {
            // 400 = insufficient balance — message comes from WalletService
            throw new RuntimeException(
                    "Insufficient wallet balance. " +
                            "Please add funds from Profile → Wallet before placing this order."
            );
        } catch (Exception e) {
            log.error("[WalletClient] Withdraw failed for user {} amount ₹{}: {}", userId, amount, e.getMessage());
            throw new RuntimeException(
                    "Wallet service unavailable. Could not verify balance. " +
                            "Please ensure the portfolio service (port 8084) is running."
            );
        }
    }

    /**
     * Credits sale proceeds to the user's wallet after a sell executes.
     * Non-blocking — logs the error but does NOT throw, so a sell is never
     * blocked just because the wallet credit failed.
     */
    public void deposit(Long userId, BigDecimal amount) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-User-Id", userId.toString());

            Map<String, Object> body = Map.of("amount", amount);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            restTemplate.postForEntity(
                    portfolioServiceUrl + "/api/wallet/deposit",
                    request,
                    Map.class
            );

            log.info("[WalletClient] Deposited ₹{} to wallet of user {}", amount, userId);

        } catch (Exception e) {
            log.error("[WalletClient] Deposit failed for user {} amount ₹{}: {}", userId, amount, e.getMessage());
            // intentionally not re-throwing — sell should never fail due to wallet credit
        }
    }
}