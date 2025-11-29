package com.Datium.Datium.dto;

import java.util.List;

public class SystemRequest {
    private String name;
    private String description;
    private String imageUrl;
    private String securityMode;
    private String generalPassword;
    private List<FieldRequest> fields;
    private List<UserRequest> users;
    private List<UserPasswordRequest> userPasswords;

    public static class FieldRequest {
        private String name;
        private String type;
        private Boolean required;
        private Integer orderIndex;
        private List<String> options;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public Boolean getRequired() { return required; }
        public void setRequired(Boolean required) { this.required = required; }
        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
        public List<String> getOptions() { return options; }
        public void setOptions(List<String> options) { this.options = options; }
    }

    public static class UserRequest {
        private String email;
        private String role;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }

    public static class UserPasswordRequest {
        private String email;
        private String password;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getSecurityMode() { return securityMode; }
    public void setSecurityMode(String securityMode) { this.securityMode = securityMode; }
    public String getGeneralPassword() { return generalPassword; }
    public void setGeneralPassword(String generalPassword) { this.generalPassword = generalPassword; }
    public List<FieldRequest> getFields() { return fields; }
    public void setFields(List<FieldRequest> fields) { this.fields = fields; }
    public List<UserRequest> getUsers() { return users; }
    public void setUsers(List<UserRequest> users) { this.users = users; }
    public List<UserPasswordRequest> getUserPasswords() { return userPasswords; }
    public void setUserPasswords(List<UserPasswordRequest> userPasswords) { this.userPasswords = userPasswords; }
}


