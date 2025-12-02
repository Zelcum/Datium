package com.Datium.Datium.dto;

public class UpdateAvatarRequest {
    private String avatarUrl;

    public UpdateAvatarRequest() {
    }

    public UpdateAvatarRequest(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }
}
