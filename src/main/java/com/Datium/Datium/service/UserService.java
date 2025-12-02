package com.Datium.Datium.service;

import com.Datium.Datium.dto.*;
import com.Datium.Datium.entity.User;
import com.Datium.Datium.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final Map<Integer, String> PLAN_NAMES = new HashMap<>();

    static {
        PLAN_NAMES.put(1, "Básico");
        PLAN_NAMES.put(2, "Pro");
        PLAN_NAMES.put(3, "Enterprise");
    }

    public UserProfileResponse getUserProfile(Integer userId) {
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Usuario no encontrado");
        }

        User user = userOpt.get();
        String planName = PLAN_NAMES.getOrDefault(user.getPlanId(), "Desconocido");

        return new UserProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPlanId(),
                planName,
                user.getAvatarUrl(),
                user.getCreatedAt());
    }

    public UserProfileResponse updateProfile(Integer userId, UpdateProfileRequest request) {
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Usuario no encontrado");
        }

        User user = userOpt.get();

        // Check if email is being changed and if it's already in use
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("El email ya está en uso");
            }
            user.setEmail(request.getEmail());
        }

        // Update name if provided
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName());
        }

        user = userRepository.save(user);

        String planName = PLAN_NAMES.getOrDefault(user.getPlanId(), "Desconocido");

        return new UserProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPlanId(),
                planName,
                user.getAvatarUrl(),
                user.getCreatedAt());
    }

    public Map<String, String> changePassword(Integer userId, ChangePasswordRequest request) {
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Usuario no encontrado");
        }

        User user = userOpt.get();

        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new RuntimeException("La contraseña actual es incorrecta");
        }

        // Validate new password
        if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
            throw new RuntimeException("La nueva contraseña debe tener al menos 6 caracteres");
        }

        // Update password
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Contraseña actualizada exitosamente");
        return response;
    }

    public UserProfileResponse changePlan(Integer userId, ChangePlanRequest request) {
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Usuario no encontrado");
        }

        User user = userOpt.get();

        // Validate plan ID
        if (request.getNewPlanId() == null || request.getNewPlanId() < 1 || request.getNewPlanId() > 3) {
            throw new RuntimeException("Plan inválido. Debe ser 1 (Básico), 2 (Pro) o 3 (Enterprise)");
        }

        user.setPlanId(request.getNewPlanId());
        user = userRepository.save(user);

        String planName = PLAN_NAMES.getOrDefault(user.getPlanId(), "Desconocido");

        return new UserProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPlanId(),
                planName,
                user.getAvatarUrl(),
                user.getCreatedAt());
    }

    public UserProfileResponse updateAvatar(Integer userId, UpdateAvatarRequest request) {
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Usuario no encontrado");
        }

        User user = userOpt.get();

        // Update avatar URL
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        user = userRepository.save(user);

        String planName = PLAN_NAMES.getOrDefault(user.getPlanId(), "Desconocido");

        return new UserProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPlanId(),
                planName,
                user.getAvatarUrl(),
                user.getCreatedAt());
    }
}
