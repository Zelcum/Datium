package com.Datium.Datium.dto;

public class AuthResponse {
    private String token;
    private String mensaje;
    private Integer userId;
    private String nombre;
    private String email;

    public AuthResponse(String token, String mensaje, Integer userId, String nombre, String email) {
        this.token = token;
        this.mensaje = mensaje;
        this.userId = userId;
        this.nombre = nombre;
        this.email = email;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
