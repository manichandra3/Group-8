package com.sharebazaar.core.shared.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class GlobalExceptionTest {

    @Test
    void messageIsPropagatedToRuntimeException() {
        GlobalException exception = new GlobalException("boom");

        assertEquals("boom", exception.getMessage());
    }

    @Test
    void causeIsPropagatedToRuntimeException() {
        RuntimeException cause = new RuntimeException("root");
        GlobalException exception = new GlobalException("boom", cause);

        assertEquals("boom", exception.getMessage());
        assertEquals(cause, exception.getCause());
    }
}
