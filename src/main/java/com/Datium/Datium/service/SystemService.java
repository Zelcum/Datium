package com.Datium.Datium.service;

import com.Datium.Datium.dto.SystemRequest;
import com.Datium.Datium.dto.SystemResponse;
import com.Datium.Datium.dto.SystemStatisticsResponse;
import com.Datium.Datium.entity.System;
import com.Datium.Datium.entity.SystemField;
import com.Datium.Datium.entity.SystemFieldOption;
import com.Datium.Datium.entity.SystemUser;
import com.Datium.Datium.entity.SystemUserPassword;
import com.Datium.Datium.entity.User;
import com.Datium.Datium.repository.*;
import com.Datium.Datium.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SystemService {

    @Autowired
    private SystemRepository systemRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SystemUserRepository systemUserRepository;

    @Autowired
    private SystemUserPasswordRepository systemUserPasswordRepository;

    @Autowired
    private SystemFieldRepository systemFieldRepository;

    @Autowired
    private SystemFieldOptionRepository systemFieldOptionRepository;

    @Autowired
    private SystemRecordRepository systemRecordRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<SystemResponse> getAllSystems(Integer userId) {
        java.lang.System.out.println("SystemService.getAllSystems - userId: " + userId);
        try {
            List<System> systems = systemRepository.findByOwnerId(userId);
            java.lang.System.out.println("Sistemas encontrados en BD: " + systems.size());
            List<SystemResponse> responses = systems.stream().map(this::convertToResponse).collect(Collectors.toList());
            java.lang.System.out.println("Sistemas convertidos: " + responses.size());
            return responses;
        } catch (Exception e) {
            java.lang.System.err.println("Error en getAllSystems: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    public SystemResponse getSystemById(Integer id, Integer userId) {
        System system = systemRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));
        
        if (!system.getOwnerId().equals(userId)) {
            throw new RuntimeException("No tienes permisos para ver este sistema");
        }
        
        return convertToResponse(system);
    }

    @Transactional
    public SystemResponse createSystem(SystemRequest request, Integer userId) {
        System system = new System();
        system.setOwnerId(userId);
        system.setName(request.getName());
        system.setDescription(request.getDescription());
        system.setImageUrl(request.getImageUrl());
        
        if (request.getSecurityMode() != null) {
            try {
                system.setSecurityMode(System.SecurityMode.valueOf(request.getSecurityMode()));
            } catch (IllegalArgumentException e) {
                system.setSecurityMode(System.SecurityMode.none);
            }
        }
        
        if (request.getGeneralPassword() != null && !request.getGeneralPassword().isEmpty()) {
            system.setGeneralPasswordHash(passwordEncoder.encode(request.getGeneralPassword()));
        }
        
        system = systemRepository.save(system);
        
        if (request.getFields() != null) {
            for (SystemRequest.FieldRequest fieldReq : request.getFields()) {
                createField(system.getId(), fieldReq);
            }
        }
        
        if (request.getUsers() != null) {
            for (SystemRequest.UserRequest userReq : request.getUsers()) {
                createSystemUser(system.getId(), userReq);
            }
        }
        
        if (request.getUserPasswords() != null) {
            for (SystemRequest.UserPasswordRequest pwdReq : request.getUserPasswords()) {
                createSystemUserPassword(system.getId(), pwdReq);
            }
        }
        
        return convertToResponse(system);
    }

    @Transactional
    public SystemResponse updateSystem(Integer id, SystemRequest request, Integer userId) {
        System system = systemRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));
        
        if (!system.getOwnerId().equals(userId)) {
            throw new RuntimeException("No tienes permisos para editar este sistema");
        }
        
        system.setName(request.getName());
        system.setDescription(request.getDescription());
        system.setImageUrl(request.getImageUrl());
        
        if (request.getSecurityMode() != null) {
            try {
                system.setSecurityMode(System.SecurityMode.valueOf(request.getSecurityMode()));
            } catch (IllegalArgumentException e) {
                system.setSecurityMode(System.SecurityMode.none);
            }
        }
        
        if (request.getGeneralPassword() != null && !request.getGeneralPassword().isEmpty()) {
            system.setGeneralPasswordHash(passwordEncoder.encode(request.getGeneralPassword()));
        }
        
        system = systemRepository.save(system);
        
        return convertToResponse(system);
    }

    @Transactional
    public void deleteSystem(Integer id, Integer userId) {
        System system = systemRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));
        
        if (!system.getOwnerId().equals(userId)) {
            throw new RuntimeException("No tienes permisos para eliminar este sistema");
        }
        
        systemRepository.delete(system);
    }

    private void createField(Integer systemId, SystemRequest.FieldRequest fieldReq) {
        SystemField field = new SystemField();
        field.setSystemId(systemId);
        field.setName(fieldReq.getName());
        field.setType(fieldReq.getType());
        field.setRequired(fieldReq.getRequired() != null ? fieldReq.getRequired() : false);
        field.setOrderIndex(fieldReq.getOrderIndex() != null ? fieldReq.getOrderIndex() : 0);
        field = systemFieldRepository.save(field);
        
        if (fieldReq.getOptions() != null && !fieldReq.getOptions().isEmpty()) {
            for (String optionValue : fieldReq.getOptions()) {
                SystemFieldOption option = new SystemFieldOption();
                option.setFieldId(field.getId());
                option.setValue(optionValue.trim());
                systemFieldOptionRepository.save(option);
            }
        }
    }

    private void createSystemUser(Integer systemId, SystemRequest.UserRequest userReq) {
        User user = userRepository.findByEmail(userReq.getEmail())
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + userReq.getEmail()));
        
        SystemUser systemUser = new SystemUser();
        systemUser.setSystemId(systemId);
        systemUser.setUserId(user.getId());
        
        try {
            systemUser.setRole(SystemUser.Role.valueOf(userReq.getRole()));
        } catch (IllegalArgumentException e) {
            systemUser.setRole(SystemUser.Role.viewer);
        }
        
        systemUserRepository.save(systemUser);
    }

    private void createSystemUserPassword(Integer systemId, SystemRequest.UserPasswordRequest pwdReq) {
        User user = userRepository.findByEmail(pwdReq.getEmail())
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + pwdReq.getEmail()));
        
        SystemUserPassword password = new SystemUserPassword();
        password.setSystemId(systemId);
        password.setUserId(user.getId());
        
        if (pwdReq.getPassword() != null && !pwdReq.getPassword().isEmpty()) {
            password.setPasswordHash(passwordEncoder.encode(pwdReq.getPassword()));
        }
        
        systemUserPasswordRepository.save(password);
    }

    private SystemResponse convertToResponse(System system) {
        SystemResponse response = new SystemResponse();
        response.setId(system.getId());
        response.setOwnerId(system.getOwnerId());
        response.setName(system.getName());
        response.setDescription(system.getDescription());
        response.setImageUrl(system.getImageUrl());
        response.setSecurityMode(system.getSecurityMode().name());
        response.setCreatedAt(system.getCreatedAt());
        
        Long userCount = systemUserRepository.countDistinctUsersBySystemId(system.getId());
        response.setUserCount(Math.max(1, userCount != null ? userCount : 0));
        
        List<SystemUser> systemUsers = systemUserRepository.findBySystemId(system.getId());
        List<SystemResponse.UserResponse> users = new ArrayList<>();
        for (SystemUser su : systemUsers) {
            User user = userRepository.findById(su.getUserId()).orElse(null);
            if (user != null) {
                SystemResponse.UserResponse ur = new SystemResponse.UserResponse();
                ur.setUserId(user.getId());
                ur.setUserEmail(user.getEmail());
                ur.setUserName(user.getName());
                ur.setRole(su.getRole().name());
                users.add(ur);
            }
        }
        response.setUsers(users);
        
        return response;
    }

    public SystemStatisticsResponse getStatistics(Integer userId) {
        SystemStatisticsResponse stats = new SystemStatisticsResponse();
        
        Long totalSystems = systemRepository.countByOwnerId(userId);
        stats.setTotalSystems(totalSystems != null ? totalSystems : 0L);
        
        stats.setSecurityNone(systemRepository.countBySecurityMode(System.SecurityMode.none));
        stats.setSecurityGeneral(systemRepository.countBySecurityMode(System.SecurityMode.general));
        stats.setSecurityIndividual(systemRepository.countBySecurityMode(System.SecurityMode.individual));
        
        Long totalUsers = systemUserRepository.count();
        stats.setTotalUsers(totalUsers != null ? totalUsers : 0L);
        
        Long totalRecords = systemRecordRepository.count();
        stats.setTotalRecords(totalRecords != null ? totalRecords : 0L);
        
        stats.setPlanBasic(0L);
        stats.setPlanPro(0L);
        stats.setPlanEnterprise(0L);
        
        SystemStatisticsResponse.PlanUsage planUsage = new SystemStatisticsResponse.PlanUsage();
        planUsage.setCurrent(totalSystems != null ? totalSystems : 0L);
        planUsage.setMax(999L);
        planUsage.setPlanName("Básico");
        stats.setPlanUsage(planUsage);
        
        List<String> labels = new ArrayList<>();
        List<Long> data = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            labels.add(date.toString());
            data.add(0L);
        }
        stats.setActivityLabels(labels);
        stats.setActivityData(data);
        
        return stats;
    }

    public Map<String, Object> getCreateLimit(Integer userId) {
        Map<String, Object> response = new HashMap<>();
        
        Long currentCount = systemRepository.countByOwnerId(userId);
        Long maxSystems = 999L;
        
        response.put("canCreate", currentCount < maxSystems);
        response.put("currentCount", currentCount != null ? currentCount : 0L);
        response.put("maxSystems", maxSystems);
        
        return response;
    }
}

