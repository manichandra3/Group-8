package com.sharebazaar.stock.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Client subscribes to /topic/...
        registry.enableSimpleBroker("/topic");
        // Client sends messages to /app/...  (not needed for price feed, but good practice)
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // React connects to ws://localhost:8082/ws
        // SockJS fallback for browsers that don't support native WebSocket
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")   // tighten to your frontend URL in prod
                .withSockJS();
    }
}