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
    private com.Datium.Datium.repository.PlanRepository planRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public UserProfileResponse getUserProfile(Integer userId) {
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Usuario no encontrado");
        }

        User user = userOpt.get();
        String planName = "Desconocido";
        if (user.getPlanId() != null) {
            planName = planRepository.findById(user.getPlanId())
                    .map(com.Datium.Datium.entity.Plan::getName)
                    .orElse("Desconocido");
        }

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

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("El email ya está en uso");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName());
        }

        user = userRepository.save(user);

        String planName = "Desconocido";
        if (user.getPlanId() != null) {
            planName = planRepository.findById(user.getPlanId())
                    .map(com.Datium.Datium.entity.Plan::getName)
                    .orElse("Desconocido");
        }

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

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new RuntimeException("La contraseña actual es incorrecta");
        }

        if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
            throw new RuntimeException("La nueva contraseña debe tener al menos 6 caracteres");
        }

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

        if (request.getNewPlanId() == null) {
            throw new RuntimeException("ID de plan inválido");
        }
        
        com.Datium.Datium.entity.Plan newPlan = planRepository.findById(request.getNewPlanId())
                .orElseThrow(() -> new RuntimeException("Plan no encontrado"));

        user.setPlanId(request.getNewPlanId());
        user = userRepository.save(user);

        String planName = newPlan.getName();

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

        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        user = userRepository.save(user);

        String planName = "Desconocido";
        if (user.getPlanId() != null) {
            planName = planRepository.findById(user.getPlanId())
                    .map(com.Datium.Datium.entity.Plan::getName)
                    .orElse("Desconocido");
        }

        return new UserProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPlanId(),
                planName,
                user.getAvatarUrl(),
                user.getCreatedAt());
    }

    public boolean verifyPassword(Integer userId, String password) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return false;
        }
        return passwordEncoder.matches(password, userOpt.get().getPasswordHash());
    }
}
