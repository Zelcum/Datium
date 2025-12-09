package com.Datium.Datium.dto;

public class InvitationRequest {
    private String email;
    private String permission; // EDITOR, VIEWER

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPermission() { return permission; }
    public void setPermission(String permission) { this.permission = permission; }
}
