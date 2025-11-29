package com.Datium.Datium.controller;

import com.Datium.Datium.entity.SystemUser;
import com.Datium.Datium.entity.User;
import com.Datium.Datium.entity.SystemUserPassword;
import com.Datium.Datium.entity.System;
import com.Datium.Datium.repository.SystemUserRepository;
import com.Datium.Datium.repository.SystemUserPasswordRepository;
import com.Datium.Datium.repository.UserRepository;
import com.Datium.Datium.repository.SystemRepository;
import com.Datium.Datium.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sistemas/{systemId}/accesos")
@CrossOrigin(origins = "*")
public class SystemAccessController {

    @Autowired
    private SystemUserRepository systemUserRepository;

    @Autowired
    private SystemUserPasswordRepository systemUserPasswordRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SystemRepository systemRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Integer getUserIdFromToken(String token) {
        if (token == null) return null;
        if (!token.startsWith("Bearer ")) {
            try {
                return jwtUtil.extractUserId(token);
            } catch (Exception e) {
                return null;
            }
        }
        try {
            String jwt = token.substring(7);
            return jwtUtil.extractUserId(jwt);
        } catch (Exception e) {
            return null;
        }
    }

    @GetMapping
    public ResponseEntity<?> getAccessUsers(
            @PathVariable Integer systemId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            System system = systemRepository.findById(systemId).orElse(null);
            if (system == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            if (!system.getOwnerId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            List<SystemUser> systemUsers = systemUserRepository.findBySystemId(systemId);
            List<Map<String, Object>> response = systemUsers.stream().map(su -> {
                User user = userRepository.findById(su.getUserId()).orElse(null);
                SystemUserPassword password = systemUserPasswordRepository.findBySystemIdAndUserId(systemId, su.getUserId()).orElse(null);
                
                Map<String, Object> userData = new HashMap<>();
                userData.put("userEmail", user != null ? user.getEmail() : "");
                userData.put("userName", user != null ? user.getName() : "");
                userData.put("role", su.getRole().name());
                userData.put("hasPassword", password != null && password.getPasswordHash() != null && !password.getPasswordHash().isEmpty());
                return userData;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping
    public ResponseEntity<?> addAccessUser(
            @PathVariable Integer systemId,
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            System system = systemRepository.findById(systemId).orElse(null);
            if (system == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            if (!system.getOwnerId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            String email = request.get("email");
            String roleStr = request.get("role");
            String password = request.get("password");

            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("{\"error\":\"Usuario no encontrado\"}");
            }

            if (systemUserRepository.existsBySystemIdAndUserId(systemId, user.getId())) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("{\"error\":\"El usuario ya tiene acceso a este sistema\"}");
            }

            SystemUser systemUser = new SystemUser();
            systemUser.setSystemId(systemId);
            systemUser.setUserId(user.getId());
            systemUser.setRole(SystemUser.Role.valueOf(roleStr));
            systemUserRepository.save(systemUser);

            if (password != null && !password.isEmpty() && system.getSecurityMode() == System.SecurityMode.individual) {
                SystemUserPassword userPassword = new SystemUserPassword();
                userPassword.setSystemId(systemId);
                userPassword.setUserId(user.getId());
                userPassword.setPasswordHash(passwordEncoder.encode(password));
                systemUserPasswordRepository.save(userPassword);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body("{\"message\":\"Usuario agregado exitosamente\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @PutMapping
    public ResponseEntity<?> updateAccessUser(
            @PathVariable Integer systemId,
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            System system = systemRepository.findById(systemId).orElse(null);
            if (system == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            if (!system.getOwnerId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            String email = request.get("email");
            String roleStr = request.get("role");

            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("{\"error\":\"Usuario no encontrado\"}");
            }

            SystemUser systemUser = systemUserRepository.findBySystemIdAndUserId(systemId, user.getId()).orElse(null);
            if (systemUser == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("{\"error\":\"Acceso no encontrado\"}");
            }

            systemUser.setRole(SystemUser.Role.valueOf(roleStr));
            systemUserRepository.save(systemUser);

            return ResponseEntity.ok("{\"message\":\"Usuario actualizado exitosamente\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @DeleteMapping
    public ResponseEntity<?> deleteAccessUser(
            @PathVariable Integer systemId,
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            System system = systemRepository.findById(systemId).orElse(null);
            if (system == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            if (!system.getOwnerId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            String email = request.get("email");
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("{\"error\":\"Usuario no encontrado\"}");
            }

            SystemUser systemUser = systemUserRepository.findBySystemIdAndUserId(systemId, user.getId()).orElse(null);
            if (systemUser != null) {
                systemUserRepository.delete(systemUser);
            }

            SystemUserPassword userPassword = systemUserPasswordRepository.findBySystemIdAndUserId(systemId, user.getId()).orElse(null);
            if (userPassword != null) {
                systemUserPasswordRepository.delete(userPassword);
            }

            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @PostMapping("/password")
    public ResponseEntity<?> setUserPassword(
            @PathVariable Integer systemId,
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            System system = systemRepository.findById(systemId).orElse(null);
            if (system == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            if (!system.getOwnerId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            String email = request.get("email");
            String password = request.get("password");

            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("{\"error\":\"Usuario no encontrado\"}");
            }

            SystemUserPassword userPassword = systemUserPasswordRepository.findBySystemIdAndUserId(systemId, user.getId()).orElse(new SystemUserPassword());
            userPassword.setSystemId(systemId);
            userPassword.setUserId(user.getId());
            
            if (password == null || password.isEmpty()) {
                userPassword.setPasswordHash(null);
            } else {
                userPassword.setPasswordHash(passwordEncoder.encode(password));
            }
            
            systemUserPasswordRepository.save(userPassword);

            return ResponseEntity.ok("{\"message\":\"Contraseña actualizada exitosamente\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @PostMapping("/password/general")
    public ResponseEntity<?> setGeneralPassword(
            @PathVariable Integer systemId,
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            System system = systemRepository.findById(systemId).orElse(null);
            if (system == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            if (!system.getOwnerId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            String password = request.get("password");
            if (password == null || password.isEmpty()) {
                system.setGeneralPasswordHash(null);
            } else {
                system.setGeneralPasswordHash(passwordEncoder.encode(password));
            }
            
            systemRepository.save(system);

            return ResponseEntity.ok("{\"message\":\"Contraseña general guardada exitosamente\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}

