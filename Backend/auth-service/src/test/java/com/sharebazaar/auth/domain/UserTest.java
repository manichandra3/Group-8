package com.sharebazaar.auth.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class UserTest {

    @Test
    void getterAndSetterShouldWork() {
        User user = new User();

        assertNull(user.getId());
        assertNull(user.getUsername());
        assertNull(user.getEmail());
        assertNull(user.getPassword());
        assertNull(user.getRole());

        user.setId(10L);
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setPassword("secret");
        user.setRole(Role.ADMIN);

        assertEquals(10L, user.getId());
        assertEquals("alice", user.getUsername());
        assertEquals("alice@example.com", user.getEmail());
        assertEquals("secret", user.getPassword());
        assertEquals(Role.ADMIN, user.getRole());
    }

    @Test
    void constructorShouldAssignFields() {
        User user = new User(1L, "bob", "bob@example.com", "hidden", Role.USER);

        assertEquals(1L, user.getId());
        assertEquals("bob", user.getUsername());
        assertEquals("bob@example.com", user.getEmail());
        assertEquals("hidden", user.getPassword());
        assertEquals(Role.USER, user.getRole());
    }
}
