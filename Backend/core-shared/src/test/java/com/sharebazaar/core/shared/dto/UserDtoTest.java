package com.sharebazaar.core.shared.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class UserDtoTest {

    @Test
    void gettersAndSettersShouldWork() {
        UserDto userDto = new UserDto();

        assertNull(userDto.getId());
        assertNull(userDto.getUsername());
        assertNull(userDto.getEmail());
        assertNull(userDto.getRole());

        userDto.setId(100L);
        userDto.setUsername("alice");
        userDto.setEmail("alice@example.com");
        userDto.setRole("USER");

        assertEquals(100L, userDto.getId());
        assertEquals("alice", userDto.getUsername());
        assertEquals("alice@example.com", userDto.getEmail());
        assertEquals("USER", userDto.getRole());
    }

    @Test
    void constructorShouldAssignValues() {
        UserDto userDto = new UserDto(1L, "bob", "bob@example.com", "ADMIN");

        assertEquals(1L, userDto.getId());
        assertEquals("bob", userDto.getUsername());
        assertEquals("bob@example.com", userDto.getEmail());
        assertEquals("ADMIN", userDto.getRole());
    }
}
