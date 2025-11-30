package com.Datium.Datium.dto;

public class InvitationRequest {
    private Integer systemId;
    private String inviteeEmail;
    private String role; // admin, editor, viewer
    private String accessType; // none, general, individual
    private String individualPassword; // Solo si accessType es individual
    private Integer expirationDays; // Días hasta expiración (opcional)

    public Integer getSystemId() {
        return systemId;
    }

    public void setSystemId(Integer systemId) {
        this.systemId = systemId;
    }

    public String getInviteeEmail() {
        return inviteeEmail;
    }

    public void setInviteeEmail(String inviteeEmail) {
        this.inviteeEmail = inviteeEmail;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getAccessType() {
        return accessType;
    }

    public void setAccessType(String accessType) {
        this.accessType = accessType;
    }

    public String getIndividualPassword() {
        return individualPassword;
    }

    public void setIndividualPassword(String individualPassword) {
        this.individualPassword = individualPassword;
    }

    public Integer getExpirationDays() {
        return expirationDays;
    }

    public void setExpirationDays(Integer expirationDays) {
        this.expirationDays = expirationDays;
    }
}

