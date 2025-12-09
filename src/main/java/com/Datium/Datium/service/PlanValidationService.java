package com.Datium.Datium.service;

import com.Datium.Datium.entity.Plan;
import com.Datium.Datium.entity.User;
import com.Datium.Datium.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class PlanValidationService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlanRepository planRepository;

    @Autowired
    private SystemRepository systemRepository;

    @Autowired
    private SystemRecordRepository systemRecordRepository;

    @Autowired
    private SystemFieldRepository systemFieldRepository;

    public void validateSystemLimit(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        Plan plan = planRepository.findById(user.getPlanId())
                .orElseThrow(() -> new RuntimeException("Plan no encontrado"));

        if (plan.getMaxSystems() != null) {
            long currentSystems = systemRepository.countByOwnerId(userId);
            if (currentSystems >= plan.getMaxSystems()) {
                throw new RuntimeException("Has alcanzado el límite de sistemas de tu plan (" + plan.getMaxSystems() + ")");
            }
        }
    }

    public void validateRecordLimit(Integer systemId) {
        com.Datium.Datium.entity.System system = systemRepository.findById(systemId)
                .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));
        
        validateRecordLimitForOwner(system.getOwnerId(), systemId);
    }
    
    public void validateRecordLimitForOwner(Integer ownerId, Integer systemId) {
        User user = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        Plan plan = planRepository.findById(user.getPlanId())
                .orElseThrow(() -> new RuntimeException("Plan no encontrado"));
        
        if (plan.getMaxRecordsPerSystem() != null) {
            long currentRecords = systemRecordRepository.countBySystemId(systemId);
            if (currentRecords >= plan.getMaxRecordsPerSystem()) {
                throw new RuntimeException("Has alcanzado el límite de registros por sistema de tu plan (" + plan.getMaxRecordsPerSystem() + ")");
            }
        }
    }

    public void validateFieldLimit(Integer systemId) {
         com.Datium.Datium.entity.System system = systemRepository.findById(systemId)
                .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));
         
         validateFieldLimitForOwner(system.getOwnerId(), systemId);
    }

    public void validateFieldLimitForOwner(Integer ownerId, Integer systemId) {
        User user = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        Plan plan = planRepository.findById(user.getPlanId())
                .orElseThrow(() -> new RuntimeException("Plan no encontrado"));

        if (plan.getMaxFieldsPerSystem() != null) {
            long currentFields = systemFieldRepository.countBySystemId(systemId);
            if (currentFields >= plan.getMaxFieldsPerSystem()) {
                throw new RuntimeException("Has alcanzado el límite de campos por sistema de tu plan (" + plan.getMaxFieldsPerSystem() + ")");
            }
        }
    }

    @Autowired
    private SystemTableRepository systemTableRepository;

    public void validateTableLimit(Integer systemId) {
        com.Datium.Datium.entity.System system = systemRepository.findById(systemId)
               .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));
        
        validateTableLimitForOwner(system.getOwnerId(), systemId);
   }

   public void validateTableLimitForOwner(Integer ownerId, Integer systemId) {
       User user = userRepository.findById(ownerId)
               .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
       Plan plan = planRepository.findById(user.getPlanId())
               .orElseThrow(() -> new RuntimeException("Plan no encontrado"));

       if (plan.getMaxTablesPerSystem() != null) {
           long currentTables = systemTableRepository.countBySystemId(systemId);
           if (currentTables >= plan.getMaxTablesPerSystem()) {
               throw new RuntimeException("Has alcanzado el límite de tablas por sistema de tu plan (" + plan.getMaxTablesPerSystem() + ")");
           }
       }
   }
}
