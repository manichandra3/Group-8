package com.sharebazaar.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ChangePasswordRequest {

    private Long userId;

    @NotBlank(message = "Current password is required")
    private String currentPassword;

    @NotBlank(message = "New password is required")
    @Size(min = 6, message = "New password must be at least 6 characters")
    private String newPassword;

    public ChangePasswordRequest() {}

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getCurrentPassword() { return currentPassword; }
    public void setCurrentPassword(String c) { this.currentPassword = c; }

    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String n) { this.newPassword = n; }
}