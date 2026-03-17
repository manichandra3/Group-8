package com.sharebazaar.auth.dto;

import com.sharebazaar.core.shared.dto.UserDto;

public record AuthResponse(String token, UserDto user) {
}
