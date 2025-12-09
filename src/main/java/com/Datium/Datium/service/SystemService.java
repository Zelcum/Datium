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

    @Autowired
    private SystemShareRepository systemShareRepository;

    @Autowired
    private PlanValidationService planValidationService;

    public List<SystemResponse> getAllSystems(Integer userId) {
        try {
            if (userId == null) {
                return new ArrayList<>();
            }
            
            User currentUser = userRepository.findById(userId).orElse(null);
            if (currentUser == null) return new ArrayList<>();

            List<System> ownedSystems = systemRepository.findByOwnerId(userId);
            List<SystemUser> invitedSystems = systemUserRepository.findByUserId(userId);
            List<com.Datium.Datium.entity.SystemShare> sharedSystems = systemShareRepository.findByUserEmail(currentUser.getEmail());
            
            java.util.Set<Integer> systemIds = new java.util.HashSet<>();
            List<System> allSystems = new ArrayList<>();
            
            for (System system : ownedSystems) {
                systemIds.add(system.getId());
                allSystems.add(system);
            }
            
            for (SystemUser systemUser : invitedSystems) {
                if (!systemIds.contains(systemUser.getSystemId())) {
                    System system = systemRepository.findById(systemUser.getSystemId()).orElse(null);
                    if (system != null) {
                        allSystems.add(system);
                        systemIds.add(system.getId());
                    }
                }
            }

            for (com.Datium.Datium.entity.SystemShare share : sharedSystems) {
                if (!systemIds.contains(share.getSystemId())) {
                     System system = systemRepository.findById(share.getSystemId()).orElse(null);
                     if (system != null) {
                         allSystems.add(system);
                         systemIds.add(system.getId());
                     }
                }
            }
            
            List<SystemResponse> responses = allSystems.stream()
                .map(system -> convertToResponse(system, userId))
                .collect(Collectors.toList());
            return responses;
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }

    public SystemResponse getSystemById(Integer id, Integer userId) {
        System system = systemRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));
        
        boolean isOwner = system.getOwnerId().equals(userId);
        boolean isInvited = systemUserRepository.existsBySystemIdAndUserId(id, userId);
        
        boolean isShared = false;
        if (!isOwner && !isInvited) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                isShared = systemShareRepository.findBySystemIdAndUserEmail(id, user.getEmail()).isPresent();
            }
        }
        
        if (!isOwner && !isInvited && !isShared) {
            throw new RuntimeException("No tienes permisos para ver este sistema");
        }
        
        return convertToResponse(system, userId);
    }

    @Transactional
    public SystemResponse createSystem(SystemRequest request, Integer userId) {
        planValidationService.validateSystemLimit(userId);
        
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
        
        return convertToResponse(system, userId);
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
        
        return convertToResponse(system, userId);
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
        
        if (systemUserRepository.existsBySystemIdAndUserId(systemId, user.getId())) {
            return;
        }
        
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

    private SystemResponse convertToResponse(System system, Integer userId) {
        SystemResponse response = new SystemResponse();
        response.setId(system.getId());
        response.setOwnerId(system.getOwnerId());
        response.setName(system.getName());
        response.setDescription(system.getDescription());
        response.setImageUrl(system.getImageUrl());
        response.setSecurityMode(system.getSecurityMode().name());
        response.setCreatedAt(system.getCreatedAt());
        
        List<SystemUser> systemUsers = systemUserRepository.findBySystemId(system.getId());
        List<SystemResponse.UserResponse> users = new ArrayList<>();
        
        User owner = userRepository.findById(system.getOwnerId()).orElse(null);
        if (owner != null) {
            SystemResponse.UserResponse ownerResponse = new SystemResponse.UserResponse();
            ownerResponse.setUserId(owner.getId());
            ownerResponse.setUserEmail(owner.getEmail());
            ownerResponse.setUserName(owner.getName());
            ownerResponse.setRole("owner");
            users.add(ownerResponse);
        }
        
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
        
        Long userCount = (long) users.size();
        response.setUserCount(Math.max(1, userCount));
        response.setUsers(users);
        
        boolean isOwner = system.getOwnerId().equals(userId);
        boolean isInvited = !isOwner && systemUserRepository.existsBySystemIdAndUserId(system.getId(), userId);
        response.setIsInvited(isInvited);
        
        return response;
    }

    @Autowired
    private PlanRepository planRepository;

    public SystemStatisticsResponse getStatistics(Integer userId) {
        SystemStatisticsResponse stats = new SystemStatisticsResponse();
        
        if (userId == null) {
            stats.setTotalSystems(0L);
            stats.setSecurityNone(0L);
            stats.setSecurityGeneral(0L);
            stats.setSecurityIndividual(0L);
            stats.setTotalUsers(0L);
            stats.setTotalRecords(0L);
            return stats;
        }
        
        List<System> ownedSystems = systemRepository.findByOwnerId(userId);
        
        User user = userRepository.findById(userId).orElse(null);
        com.Datium.Datium.entity.Plan plan = null;
        if (user != null && user.getPlanId() != null) {
            plan = planRepository.findById(user.getPlanId()).orElse(null);
        }

        if (ownedSystems.isEmpty()) {
            stats.setTotalSystems(0L);
            stats.setSecurityNone(0L);
            stats.setSecurityGeneral(0L);
            stats.setSecurityIndividual(0L);
            stats.setTotalUsers(0L);
            stats.setTotalRecords(0L);
            
            SystemStatisticsResponse.PlanUsage planUsage = new SystemStatisticsResponse.PlanUsage();
            planUsage.setCurrent(0L);
            planUsage.setMax(plan != null && plan.getMaxSystems() != null ? plan.getMaxSystems().longValue() : -1L);
            planUsage.setPlanName(plan != null ? plan.getName() : "Básico");
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
        
        stats.setTotalSystems((long) ownedSystems.size());
        
        long securityNone = ownedSystems.stream()
            .filter(s -> s.getSecurityMode() == System.SecurityMode.none)
            .count();
        long securityGeneral = ownedSystems.stream()
            .filter(s -> s.getSecurityMode() == System.SecurityMode.general)
            .count();
        long securityIndividual = ownedSystems.stream()
            .filter(s -> s.getSecurityMode() == System.SecurityMode.individual)
            .count();
        
        stats.setSecurityNone(securityNone);
        stats.setSecurityGeneral(securityGeneral);
        stats.setSecurityIndividual(securityIndividual);
        
        java.util.Set<Integer> distinctUserIds = new java.util.HashSet<>();
        for (System system : ownedSystems) {
            if (!system.getOwnerId().equals(userId)) continue;
            
            distinctUserIds.add(system.getOwnerId());
            List<SystemUser> systemUsers = systemUserRepository.findBySystemId(system.getId());
            for (SystemUser su : systemUsers) {
                distinctUserIds.add(su.getUserId());
            }
        }
        stats.setTotalUsers((long) distinctUserIds.size());
        
        long totalRecords = 0L;
        for (System system : ownedSystems) {
            if (!system.getOwnerId().equals(userId)) continue;
            Long count = systemRecordRepository.countBySystemId(system.getId());
            if (count != null) {
                totalRecords += count;
            }
        }
        stats.setTotalRecords(totalRecords);
        
        stats.setPlanBasic(0L);
        stats.setPlanPro(0L);
        stats.setPlanEnterprise(0L);
        
        SystemStatisticsResponse.PlanUsage planUsage = new SystemStatisticsResponse.PlanUsage();
        planUsage.setCurrent((long) ownedSystems.size());
        planUsage.setMax(plan != null && plan.getMaxSystems() != null ? plan.getMaxSystems().longValue() : -1L);
        planUsage.setPlanName(plan != null ? plan.getName() : "Básico");
        stats.setPlanUsage(planUsage);
        
        List<Integer> systemIds = ownedSystems.stream().map(System::getId).collect(Collectors.toList());
        LocalDateTime startDate = LocalDate.now().minusDays(6).atStartOfDay();
        List<Object[]> results = systemRecordRepository.countBySystemIdsGroupedByDate(systemIds, startDate);

        Map<String, Long> activityMap = new HashMap<>();
        for (Object[] row : results) {
            String dateStr = row[0].toString(); 
            Long count = (Long) row[1];
            activityMap.put(dateStr, count);
        }

        List<String> labels = new ArrayList<>();
        List<Long> data = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            String dateStr = date.toString();
            labels.add(dateStr);
            data.add(activityMap.getOrDefault(dateStr, 0L));
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
    public boolean verifyPassword(Integer systemId, String password) {
        System system = systemRepository.findById(systemId)
            .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));
        
        if (system.getSecurityMode() == System.SecurityMode.none) {
            return true;
        }

        if (system.getSecurityMode() == System.SecurityMode.general) {
            String hash = system.getGeneralPasswordHash();
            if (hash == null || hash.isEmpty()) return true;
            if (password == null) return false;
            return passwordEncoder.matches(password, hash);
        }

        return true; 
    }
}
